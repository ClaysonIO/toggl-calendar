import {calendarDb} from "./calendarDb";
import {IProjectPreference, ITogglTimeEntryStored} from "./calendarDb";
import {rawEntriesToSimpleData} from "./buildSimpleData";
import {ISingleProjectTasks} from "./Interfaces/ISingleProjectTasks";

/**
 * Read time entries for a workspace and date range from Dexie and return
 * the same simpleData shape (projectId -> ISingleProjectTasks) used by the Calendar.
 */
export async function getSimpleDataFromDexie(
    workspaceId: number,
    startDate: string,
    endDate: string
): Promise<{ [key: number]: ISingleProjectTasks } | undefined> {
    if (!workspaceId || !startDate || !endDate) return undefined;
    const entries = await calendarDb.togglTimeEntries
        .where("[workspaceId+startDate]")
        .between([workspaceId, startDate], [workspaceId, endDate], true, true)
        .toArray();
    const result = rawEntriesToSimpleData(entries as ITogglTimeEntryStored[]);
    return result ?? {};
}

export type BillableFilter = "billable" | "nonBillable" | "all";

/**
 * Aggregate hours per day for a workspace and date range, filtered by billable preference.
 * Returns a map of date string (YYYY-MM-DD) to total hours, and total sum.
 * When projectId is set, only that project's hours are included (filter still applies).
 */
export async function getBillableHoursByDay(
    workspaceId: number,
    startDate: string,
    endDate: string,
    filter: BillableFilter,
    projectId?: number | null
): Promise<{ byDay: { [date: string]: number }; total: number }> {
    const simpleData = await getSimpleDataFromDexie(workspaceId, startDate, endDate);
    const prefs = await calendarDb.projectPreferences.where("workspaceId").equals(workspaceId).toArray();
    const prefsByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
        acc[p.projectId] = p.billable;
        return acc;
    }, {});

    const byDay: { [date: string]: number } = {};
    let total = 0;

    if (!simpleData) return { byDay, total };

    const projectIds = projectId != null ? [projectId] : Object.keys(simpleData).map(Number);
    for (const pid of projectIds) {
        const project = simpleData[pid];
        if (!project) continue;
        const isBillable = prefsByProject[pid] ?? true;
        const include =
            filter === "all" ||
            (filter === "billable" && isBillable) ||
            (filter === "nonBillable" && !isBillable);
        if (!include) continue;
        if (!project?.dates) continue;
        for (const [date, dayData] of Object.entries(project.dates)) {
            const hours = dayData.hours ?? 0;
            if (hours <= 0) continue;
            byDay[date] = (byDay[date] ?? 0) + hours;
            total += hours;
        }
    }

    return { byDay, total };
}
