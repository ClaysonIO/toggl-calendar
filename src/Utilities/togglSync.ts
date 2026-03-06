import dayjs, {Dayjs} from "dayjs";
import {calendarDb} from "./calendarDb";
import {ITogglProjectStored, ITogglTimeEntryStored} from "./calendarDb";
import {Toggl} from "./Toggl";
import {ISingleProject} from "./Interfaces/ISingleProject";

const TOGGL_API = import.meta.env.DEV ? '/toggl-api' : 'https://api.track.toggl.com';

function getProjectKey(project: ISingleProject): string {
    return `${project.workspace_id}:${project.id}`;
}

/**
 * Fetch projects from Toggl and write them to Dexie for the given workspace.
 * Replaces all stored projects for that workspace with the API response.
 */
export async function syncProjects(apiKey: string, workspaceId: number): Promise<void> {
    const projects = await Toggl.fetchProjects(apiKey, String(workspaceId)) as ISingleProject[];
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
 * Upserts entries by id (so overlapping fetches merge correctly).
 */
export async function syncWeekDetails(
    apiKey: string,
    userId: number,
    workspaceId: number,
    startDate: Dayjs,
    endDate: Dayjs
): Promise<void> {
    const raw = await Toggl.FetchDateRangeDetails(apiKey, userId, String(workspaceId), startDate, endDate);
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
 * Sync a long date range by iterating week-by-week. Use for annual view.
 */
export async function syncDateRange(
    apiKey: string,
    userId: number,
    workspaceId: number,
    startDate: Dayjs,
    endDate: Dayjs
): Promise<void> {
    let current = startDate.startOf("week");
    const end = endDate.endOf("week");
    while (current.isBefore(end) || current.isSame(end, "day")) {
        const weekEnd = current.endOf("week");
        const chunkStart = current.isBefore(startDate) ? startDate : current;
        const chunkEnd = weekEnd.isAfter(endDate) ? endDate : weekEnd;
        await syncWeekDetails(apiKey, userId, workspaceId, chunkStart, chunkEnd);
        current = current.add(1, "week").startOf("week");
    }
}
