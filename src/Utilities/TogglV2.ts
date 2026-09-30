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
 *
 * All endpoint paths live in PATHS below. Responses are normalised into the same shapes the
 * v1 client returns (IUser, ISingleProject, ITaskResponse) so the rest of the app is unchanged.
 */
const TOGGL_FOCUS_API = import.meta.env.DEV ? '/toggl-focus/api' : 'https://focus.toggl.com/api';

const PATHS = {
    me: () => `/users/me`,
    organizations: () => `/organizations`,
    workspaces: (orgId: number) => `/organizations/${orgId}/workspaces`,
    projects: (orgId: number, wsId: number | string) => `/organizations/${orgId}/workspaces/${wsId}/projects`,
    timeEntries: (orgId: number, wsId: number | string) => `/organizations/${orgId}/workspaces/${wsId}/time_entries`,
};

/** workspace id -> organization id, filled in by GetUser */
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

/** Lists come back either as a bare array or wrapped ({items|data|workspaces|...: [...]}) */
function asList(data: any): any[] {
    if (Array.isArray(data)) return data;
    for (const key of ["items", "data", "results", "workspaces", "organizations", "projects", "time_entries"]) {
        if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
}

function nextCursor(data: any): string | null {
    const cursor = data?.next_cursor ?? data?.pagination?.next_cursor ?? data?.meta?.next_cursor;
    return cursor ? String(cursor) : null;
}

async function requestAll(apiKey: string, path: string, params: Record<string, unknown> = {}): Promise<any[]> {
    const collected: any[] = [];
    let cursor: string | null = null;
    do {
        const data = await request(apiKey, path, cursor ? {...params, cursor} : params);
        collected.push(...asList(data));
        cursor = nextCursor(data);
    } while (cursor);
    return collected;
}

async function organizationIdFor(apiKey: string, workspaceId: number | string): Promise<number> {
    const wsId = Number(workspaceId);
    if (!workspaceOrganizations.has(wsId)) {
        await GetUser(apiKey);
    }
    const orgId = workspaceOrganizations.get(wsId);
    if (orgId == null) {
        throw new Error(`Toggl v2: workspace ${workspaceId} was not found in any organization`);
    }
    return orgId;
}

export async function GetUser(apiKey: string): Promise<IUser> {
    const [me, organizations] = await Promise.all([
        request(apiKey, PATHS.me()),
        requestAll(apiKey, PATHS.organizations()),
    ]);

    const workspaces: IUser["workspaces"] = [];
    for (const org of organizations) {
        const orgWorkspaces = Array.isArray(org?.workspaces)
            ? org.workspaces
            : await requestAll(apiKey, PATHS.workspaces(org.id));
        for (const ws of orgWorkspaces) {
            workspaceOrganizations.set(Number(ws.id), Number(org.id));
            workspaces.push({
                id: Number(ws.id),
                name: String(ws.name ?? ""),
                organization_id: Number(org.id),
                api_token: "",
                at: String(ws.at ?? ws.updated_at ?? ""),
            });
        }
    }

    const user = me?.user ?? me;
    return {
        ...user,
        id: Number(user?.id ?? user?.user_id),
        fullname: user?.fullname ?? user?.full_name ?? user?.name ?? "",
        workspaces,
    } as IUser;
}

function normaliseProject(project: any, workspaceId: number): ISingleProject {
    return {
        id: Number(project.id),
        workspace_id: Number(project.workspace_id ?? workspaceId),
        client_id: project.client_id ?? project.client?.id ?? null,
        client_name: project.client_name ?? project.client?.name ?? "",
        name: String(project.name ?? ""),
        color: String(project.color ?? project.hex_color ?? ""),
        status: String(project.status ?? (project.active === false || project.archived ? "archived" : "active")),
    };
}

export async function fetchProjects(apiKey: string, workspace_id: string): Promise<ISingleProject[]> {
    const orgId = await organizationIdFor(apiKey, workspace_id);
    const projects = await requestAll(apiKey, PATHS.projects(orgId, workspace_id));
    return projects.map(project => normaliseProject(project, Number(workspace_id)));
}

function durationMs(entry: any): number {
    const start = entry.start ?? entry.started_at;
    const stop = entry.stop ?? entry.end ?? entry.stopped_at ?? entry.ended_at;
    if (typeof entry.duration === "number" && entry.duration >= 0) return entry.duration * 1000;
    if (typeof entry.duration_ms === "number") return entry.duration_ms;
    // Running entry (or no duration reported): measure up to stop / now
    return Math.max(0, dayjs(stop ?? undefined).diff(dayjs(start)));
}

export async function FetchDateRangeDetails(apiKey: string, user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs): Promise<ITaskResponse[]> {
    const [since, until] = startDate.isBefore(endDate) ? [startDate, endDate] : [endDate, startDate];
    const orgId = await organizationIdFor(apiKey, workspace_id);

    const [entries, projects] = await Promise.all([
        requestAll(apiKey, PATHS.timeEntries(orgId, workspace_id), {
            start_date: since.startOf('day').format(),
            end_date: until.endOf('day').format(),
            user_id: user_id || undefined,
        }),
        fetchProjects(apiKey, workspace_id),
    ]);
    const projectsById = new Map(projects.map(project => [project.id, project]));

    return entries
        .filter(entry => !user_id || entry.user_id == null || Number(entry.user_id) === user_id)
        .map((entry): ITaskResponse => {
            const pid = Number(entry.project_id ?? entry.project?.id);
            const project = projectsById.get(pid);
            const start = entry.start ?? entry.started_at;
            const end = entry.stop ?? entry.end ?? entry.stopped_at ?? entry.ended_at ?? "";
            const color = project?.color || entry.project?.color || "";
            return {
                id: Number(entry.id),
                description: entry.description ?? entry.name ?? null,
                start,
                end,
                dur: durationMs(entry),
                pid,
                project: project?.name ?? entry.project?.name ?? "",
                client: project?.client_name ?? "",
                project_color: color,
                project_hex_color: color,
                is_billable: !!entry.billable,
                tags: Array.isArray(entry.tags) ? entry.tags.map((tag: any) => typeof tag === "string" ? tag : tag?.name) : [],
                uid: Number(entry.user_id ?? user_id),
                user: "",
                updated: entry.at ?? entry.updated_at ?? "",
                use_stop: true,
            };
        });
}
