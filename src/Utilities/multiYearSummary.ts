import dayjs from "dayjs";
import {ISingleProjectTasks} from "./Interfaces/ISingleProjectTasks";
import type {BillableFilter} from "./togglDetailsFromDexie";

export interface IHoursSplit {
    all: number;
    billable: number;
    nonBillable: number;
}

export interface IYearSummary {
    label: number;
    startKey: string;
    endKey: string;
    isCurrent: boolean;
    /** Days of the fiscal year elapsed through today (the full year for past years). */
    elapsedDays: number;
    hours: IHoursSplit;
    /** Distinct days with any logged time. */
    daysWorked: number;
    projectCount: number;
    clientCount: number;
    /** Hours per fiscal month (index 0 = first month of the fiscal year). */
    months: IHoursSplit[];
    /** Hours per client name. */
    clients: Record<string, IHoursSplit>;
}

export const NO_CLIENT_LABEL = "No client";

const emptySplit = (): IHoursSplit => ({all: 0, billable: 0, nonBillable: 0});

const addHours = (split: IHoursSplit, hours: number, billable: boolean) => {
    split.all += hours;
    if (billable) split.billable += hours;
    else split.nonBillable += hours;
};

export const pickHours = (split: IHoursSplit, filter: BillableFilter) =>
    filter === "all" ? split.all : filter === "billable" ? split.billable : split.nonBillable;

/**
 * Bucket per-project, per-day hours into fiscal years.
 * `years` must be the fiscal years to report on; dates outside them are ignored.
 */
export function buildYearSummaries(
    simpleData: {[key: number]: ISingleProjectTasks},
    billableByProject: Record<number, boolean>,
    years: Array<{label: number; startKey: string; endKey: string}>,
    startMonth: number,
    todayKey: string
): IYearSummary[] {
    const summaries: IYearSummary[] = years.map(y => {
        const isCurrent = y.startKey <= todayKey && todayKey <= y.endKey;
        const lastDay = todayKey < y.endKey ? todayKey : y.endKey;
        const elapsedDays = lastDay < y.startKey ? 0 : dayjs(lastDay).diff(dayjs(y.startKey), "day") + 1;
        return {
            ...y,
            isCurrent,
            elapsedDays,
            hours: emptySplit(),
            daysWorked: 0,
            projectCount: 0,
            clientCount: 0,
            months: Array.from({length: 12}, emptySplit),
            clients: {}
        };
    });
    const workedDays = summaries.map(() => new Set<string>());
    const projectsPerYear = summaries.map(() => new Set<number>());

    const yearIndexFor = (date: string) =>
        summaries.findIndex(s => s.startKey <= date && date <= s.endKey);

    for (const [pidStr, project] of Object.entries(simpleData)) {
        if (!project?.dates) continue;
        const pid = Number(pidStr);
        const billable = billableByProject[pid] ?? true;
        const client = project.client_name || NO_CLIENT_LABEL;
        for (const [date, day] of Object.entries(project.dates)) {
            const hours = day.hours ?? 0;
            if (hours <= 0) continue;
            const idx = yearIndexFor(date);
            if (idx < 0) continue;
            const summary = summaries[idx];
            addHours(summary.hours, hours, billable);
            const monthIdx = (Number(date.slice(5, 7)) - startMonth + 12) % 12;
            addHours(summary.months[monthIdx], hours, billable);
            addHours(summary.clients[client] ??= emptySplit(), hours, billable);
            workedDays[idx].add(date);
            projectsPerYear[idx].add(pid);
        }
    }

    summaries.forEach((s, i) => {
        s.daysWorked = workedDays[i].size;
        s.projectCount = projectsPerYear[i].size;
        s.clientCount = Object.keys(s.clients).length;
    });
    return summaries;
}
