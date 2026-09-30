import dayjs, {Dayjs} from "dayjs";
import {calendarDb} from "./calendarDb";
import {ITogglProjectStored, ITogglTimeEntryStored} from "./calendarDb";
import {Toggl} from "./Toggl";
import {ISingleProject} from "./Interfaces/ISingleProject";
import {TogglCredentials} from "./useTogglApiKey";

function getProjectKey(project: ISingleProject): string {
    return `${project.workspace_id}:${project.id}`;
}

/**
 * Fetch projects from Toggl and write them to Dexie for the given workspace.
 * Replaces all stored projects for that workspace with the API response.
 */
export async function syncProjects(credentials: TogglCredentials, workspaceId: number): Promise<void> {
    const projects = await Toggl.fetchProjects(credentials, String(workspaceId)) as ISingleProject[];
    const stored: ITogglProjectStored[] = projects.map((p) => ({
        ...p,
        key: getProjectKey(p)
    }));
    await calendarDb.togglProjects.where("workspace_id").equals(workspaceId).delete();
    if (stored.length > 0) {
        await calendarDb.togglProjects.bulkPut(stored);
    }
}

/**
 * Fetch time entries for a date range from Toggl and write them to Dexie.
 * Works for any date range (e.g. one week for Calendar or full year for Year view).
 * Upserts entries by id (so overlapping fetches merge correctly).
 */
export async function syncWeekDetails(
    credentials: TogglCredentials,
    userId: number,
    workspaceId: number,
    startDate: Dayjs,
    endDate: Dayjs
): Promise<void> {
    const raw = await Toggl.FetchDateRangeDetails(credentials, userId, String(workspaceId), startDate, endDate);
    const stored: ITogglTimeEntryStored[] = raw.map((entry) => ({
        ...entry,
        workspaceId,
        startDate: dayjs(entry.start).format("YYYY-MM-DD")
    }));
    if (stored.length > 0) {
        await calendarDb.togglTimeEntries.bulkPut(stored);
    }
}

/**
 * Sync time entries for a date range in a single request (e.g. full fiscal year for annual view).
 * Toggl API is called once with since/until; pagination is handled inside FetchDateRangeDetails.
 */
export async function syncDateRange(
    credentials: TogglCredentials,
    userId: number,
    workspaceId: number,
    startDate: Dayjs,
    endDate: Dayjs
): Promise<void> {
    await syncWeekDetails(credentials, userId, workspaceId, startDate, endDate);
}
