import {calendarDb, MANUAL_WORKSPACE_ID} from "./calendarDb";
import {ISingleProject} from "./Interfaces/ISingleProject";
import {ISingleProjectTasks} from "./Interfaces/ISingleProjectTasks";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";
import type {BillableFilter} from "./togglDetailsFromDexie";

export function manualProjectToSingleProject(
    project: {id?: number; companyId: number; name: string; color: string},
    companyName: string
): ISingleProject {
    return {
        id: project.id!,
        workspace_id: MANUAL_WORKSPACE_ID,
        client_id: project.companyId,
        client_name: companyName,
        name: project.name,
        color: project.color,
        status: "active",
    };
}

export async function getAllManualProjectsAsSingleProject(): Promise<ISingleProject[]> {
    const projects = await calendarDb.manualProjects.toArray();
    const companies = await calendarDb.manualCompanies.toArray();
    const companyById = new Map(companies.map(c => [c.id!, c]));
    return projects.map(p => manualProjectToSingleProject(p, companyById.get(p.companyId)?.name || ""));
}

export async function getManualSimpleData(
    startDate: string,
    endDate: string
): Promise<{[key: number]: ISingleProjectTasks}> {
    const entries = await calendarDb.manualTimeEntries
        .where("date")
        .between(startDate, endDate, true, true)
        .toArray();

    const projects = await calendarDb.manualProjects.toArray();
    const companies = await calendarDb.manualCompanies.toArray();
    const projectById = new Map(projects.map(p => [p.id!, p]));
    const companyById = new Map(companies.map(c => [c.id!, c]));

    const result: {[key: number]: ISingleProjectTasks} = {};

    for (const entry of entries) {
        if (entry.hours <= 0) continue;
        const project = projectById.get(entry.projectId);
        if (!project) continue;
        const company = companyById.get(project.companyId);

        if (!result[entry.projectId]) {
            result[entry.projectId] = {
                project_id: entry.projectId,
                project_name: project.name,
                client_name: company?.name,
                project_hex_color: project.color,
                dates: {}
            };
        }

        if (!result[entry.projectId].dates[entry.date]) {
            result[entry.projectId].dates[entry.date] = {
                date: entry.date,
                hours: 0,
                roundedHours: 0,
                taskDescriptions: new Set<string>()
            };
        }

        result[entry.projectId].dates[entry.date].hours += entry.hours;
        result[entry.projectId].dates[entry.date].roundedHours = +DecimalToRoundedTime(
            result[entry.projectId].dates[entry.date].hours
        );

        if (entry.description) {
            entry.description.split(",").map(d => d.trim()).filter(Boolean).forEach(d => {
                result[entry.projectId].dates[entry.date].taskDescriptions.add(d);
            });
        }
    }

    return result;
}

export async function getManualBillableHoursByDay(
    startDate: string,
    endDate: string,
    filter: BillableFilter,
    projectId?: number | null
): Promise<{byDay: {[date: string]: number}; total: number}> {
    const simpleData = await getManualSimpleData(startDate, endDate);
    const prefs = await calendarDb.projectPreferences
        .where("workspaceId").equals(MANUAL_WORKSPACE_ID).toArray();
    const prefsByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
        acc[p.projectId] = p.billable;
        return acc;
    }, {});

    const byDay: {[date: string]: number} = {};
    let total = 0;

    const projectIds = projectId != null ? [projectId] : Object.keys(simpleData).map(Number);
    for (const pid of projectIds) {
        const project = simpleData[pid];
        if (!project?.dates) continue;
        const isBillable = prefsByProject[pid] ?? true;
        const include =
            filter === "all" ||
            (filter === "billable" && isBillable) ||
            (filter === "nonBillable" && !isBillable);
        if (!include) continue;
        for (const [date, dayData] of Object.entries(project.dates)) {
            const hours = dayData.hours ?? 0;
            if (hours <= 0) continue;
            byDay[date] = (byDay[date] ?? 0) + hours;
            total += hours;
        }
    }

    return {byDay, total};
}

export const PROJECT_COLORS = [
    "#2da44e", "#bf3989", "#0969da", "#8250df",
    "#cf222e", "#e16f24", "#7d4e00", "#0a3069",
    "#1b7c83", "#3d7b30", "#57606a", "#2f81f7"
];
