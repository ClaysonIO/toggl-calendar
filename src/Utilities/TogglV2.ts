import axios from 'axios';
import dayjs, {Dayjs} from 'dayjs';
import {IUser} from "./Interfaces/IUser";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {ISingleProject} from "./Interfaces/ISingleProject";

/**
 * Client for the Toggl 2.0 (Focus) API — https://engineering.toggl.com/docs/focus/
 *
 * Differences from v1 (Toggl Track):
 * - Base URL is https://focus.toggl.com/api
 * - Auth is `Authorization: Bearer <api key>` (keys are created in Toggl 2.0 settings)
 * - Workspace resources are nested under their organization:
 *   /organizations/{organization_id}/workspaces/{workspace_id}/...
 * - There is no endpoint listing the user's organizations/workspaces or returning the user itself.
 *   Workspaces are discovered from /users/me/settings, and each one's organization from
 *   /workspaces/{id}/context.
 * - /time-entries returns the API key owner's own entries (other members' entries live under
 *   /time-entries/groups/users), so no user filter is needed.
 *
 * Responses are normalised into the same shapes the v1 client returns (IUser, ISingleProject,
 * ITaskResponse) so the rest of the app is unchanged.
 */
const TOGGL_FOCUS_API = import.meta.env.DEV ? '/toggl-focus/api' : 'https://focus.toggl.com/api';

const PATHS = {
    userSettings: () => `/users/me/settings`,
    workspaceContext: (wsId: number | string) => `/workspaces/${wsId}/context`,
    importSources: (orgId: number) => `/importer/${orgId}/sources`,
    projects: (orgId: number, wsId: number | string) => `/organizations/${orgId}/workspaces/${wsId}/projects`,
    timeEntries: (orgId: number, wsId: number | string) => `/organizations/${orgId}/workspaces/${wsId}/time-entries`,
};

/**
 * v2 has no "current user" endpoint, and the time-entries endpoint is already scoped to the key's
 * owner. The app only needs a truthy user id to enable syncing, so v2 users get this placeholder.
 */
const V2_CURRENT_USER_ID = -1;

const PER_PAGE = 200;

/** workspace id -> organization id */
const workspaceOrganizations = new Map<number, number>();

function request<T = any>(apiKey: string, path: string, params?: Record<string, unknown>): Promise<T> {
    return axios.get(`${TOGGL_FOCUS_API}${path}`, {
        params,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        }
    }).then(result => result.data as T);
}

/** Walks a page/per_page paginated endpoint whose response is { data: [...], per_page, total? } */
async function requestAllPages(apiKey: string, path: string, params: Record<string, unknown> = {}): Promise<any[]> {
    const collected: any[] = [];
    for (let page = 1; ; page++) {
        const body = await request(apiKey, path, {...params, page, per_page: PER_PAGE});
        const items: any[] = Array.isArray(body) ? body : (body?.data ?? []);
        collected.push(...items);
        // The server may cap per_page below what we asked for, so compare against what it reports
        const perPage = Number(body?.per_page) || PER_PAGE;
        const total = typeof body?.total === "number" ? body.total : null;
        if (items.length === 0 || items.length < perPage || (total != null && collected.length >= total)) {
            return collected;
        }
    }
}

async function organizationIdFor(apiKey: string, workspaceId: number | string): Promise<number> {
    const wsId = Number(workspaceId);
    const cached = workspaceOrganizations.get(wsId);
    if (cached != null) return cached;
    const context = await request(apiKey, PATHS.workspaceContext(wsId));
    const orgId = Number(context?.organization_id);
    if (!orgId) {
        throw new Error(`Toggl v2: could not resolve the organization for workspace ${workspaceId}`);
    }
    workspaceOrganizations.set(wsId, orgId);
    return orgId;
}

/** Best effort: the importer's source list is the only public endpoint that carries workspace names */
async function workspaceNames(apiKey: string, orgIds: number[]): Promise<Map<number, string>> {
    const names = new Map<number, string>();
    await Promise.all(orgIds.map(orgId =>
        request<any[]>(apiKey, PATHS.importSources(orgId))
            .then(sources => (Array.isArray(sources) ? sources : []).forEach(source => {
                if (source?.workspace_id && source?.workspace_name) {
                    names.set(Number(source.workspace_id), String(source.workspace_name));
                }
            }))
            .catch(() => undefined)
    ));
    return names;
}

export async function GetUser(apiKey: string): Promise<IUser> {
    const settings = await request(apiKey, PATHS.userSettings());

    const workspaceIds = Array.from(new Set(
        [settings?.current_workspace_id, settings?.mcp_active_workspace_id]
            .map(Number)
            .filter(id => Number.isFinite(id) && id > 0)
    ));
    if (settings?.mcp_active_workspace_id && settings?.mcp_active_organization_id) {
        workspaceOrganizations.set(Number(settings.mcp_active_workspace_id), Number(settings.mcp_active_organization_id));
    }

    const orgIds = await Promise.all(workspaceIds.map(id => organizationIdFor(apiKey, id)));
    const names = await workspaceNames(apiKey, Array.from(new Set(orgIds)));

    return {
        id: V2_CURRENT_USER_ID,
        beginning_of_week: settings?.start_week_on,
        language: settings?.language_code,
        date_format: settings?.date_format,
        timeofday_format: settings?.time_format,
        default_wid: Number(settings?.current_workspace_id) || workspaceIds[0],
        workspaces: workspaceIds.map((id, i) => ({
            id,
            name: names.get(id) ?? `Workspace ${id}`,
            organization_id: orgIds[i],
            api_token: "",
            at: "",
        })),
    } as IUser;
}

function normaliseProject(project: any, workspaceId: number): ISingleProject {
    return {
        id: Number(project.id),
        workspace_id: Number(project.workspace_id ?? workspaceId),
        client_id: project.client_id ?? project.client?.id ?? null,
        client_name: project.client?.name ?? "",
        name: String(project.name ?? ""),
        color: String(project.color ?? ""),
        status: project.archived_at ? "archived" : "active",
    };
}

export async function fetchProjects(apiKey: string, workspace_id: string): Promise<ISingleProject[]> {
    const orgId = await organizationIdFor(apiKey, workspace_id);
    const path = PATHS.projects(orgId, workspace_id);
    // Omitting `archived` returns active projects only, so fetch both states
    const [active, archived] = await Promise.all([
        requestAllPages(apiKey, path, {archived: false}),
        requestAllPages(apiKey, path, {archived: true}),
    ]);
    return [...active, ...archived].map(project => normaliseProject(project, Number(workspace_id)));
}

/** Entries only report start + duration (seconds); a running entry has no duration yet */
function durationMs(entry: any): number {
    if (typeof entry.duration === "number" && entry.duration >= 0) return entry.duration * 1000;
    return Math.max(0, dayjs().diff(dayjs(entry.start)));
}

export async function FetchDateRangeDetails(apiKey: string, _user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs): Promise<ITaskResponse[]> {
    const [since, until] = startDate.isBefore(endDate) ? [startDate, endDate] : [endDate, startDate];
    const orgId = await organizationIdFor(apiKey, workspace_id);

    const entries = await requestAllPages(apiKey, PATHS.timeEntries(orgId, workspace_id), {
        date_from: since.startOf('day').format(),
        date_to: until.endOf('day').format(),
        type: "activity",
        include_taskless: true,
        order_by: "start",
    });

    return entries
        // Planned (not yet tracked) entries have no start
        .filter(entry => !!entry.start)
        .map((entry): ITaskResponse => {
            const project = entry.project ?? entry.task?.project;
            const dur = durationMs(entry);
            const color = project?.color ?? "";
            return {
                id: Number(entry.id),
                description: entry.description || entry.task?.name || null,
                start: entry.start,
                end: dayjs(entry.start).add(dur, 'ms').format(),
                dur,
                pid: Number(entry.project_id ?? project?.id ?? entry.task?.project_id),
                project: project?.name ?? "",
                client: project?.client?.name ?? entry.task?.client?.name ?? "",
                project_color: color,
                project_hex_color: color,
                is_billable: !!entry.billable,
                tags: Array.isArray(entry.tags) ? entry.tags.map((tag: any) => tag?.name).filter(Boolean) : [],
                uid: Number(entry.toggl_user_id),
                user: "",
                updated: entry.updated_at ?? "",
                use_stop: true,
            };
        });
}
