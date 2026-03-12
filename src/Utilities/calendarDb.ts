import Dexie, {Table} from "dexie";
import {ISingleProject} from "./Interfaces/ISingleProject";
import {ITaskResponse} from "./Interfaces/ITaskResponse";

export interface IProjectPreference {
    key: string;
    workspaceId: number;
    projectId: number;
    billable: boolean;
    updatedAt: number;
}

export interface IWeeklyProjectPlan {
    key: string;
    workspaceId: number;
    weekStart: string;
    projectId: number;
    projectedWeekHours: number;
    projectedDailyHours?: {[date: string]: number};
    updatedAt: number;
}

export interface ICalendarSetting {
    key: string;
    value: number;
    updatedAt: number;
}

export interface IDailyBillableProjection {
    key: string;
    workspaceId: number;
    date: string;
    projectedHours: number;
    updatedAt: number;
}

/** Stored project: key = workspaceId:projectId for upsert and workspace scoping */
export interface ITogglProjectStored extends ISingleProject {
    key: string;
}

/** Stored time entry: ITaskResponse plus workspaceId and startDate for indexing */
export interface ITogglTimeEntryStored extends ITaskResponse {
    workspaceId: number;
    startDate: string;
}

export interface IManualCompany {
    id?: number;
    name: string;
    updatedAt: number;
}

export interface IManualProject {
    id?: number;
    companyId: number;
    name: string;
    color: string;
    updatedAt: number;
}

export interface IManualTimeEntry {
    key: string;
    projectId: number;
    date: string;
    hours: number;
    description: string;
    updatedAt: number;
}

export interface IProjectNote {
    key: string;
    workspaceId: number;
    projectId: number;
    notes: string;
    updatedAt: number;
}

/** Cached Toggl workspace list for offline use (id = Toggl workspace id) */
export interface ITogglWorkspaceStored {
    id: number;
    name: string;
}

export const MANUAL_WORKSPACE_ID = -1;

export const getManualTimeEntryKey = (projectId: number, date: string) =>
    `${projectId}:${date}`;

class CalendarDatabase extends Dexie {
    projectPreferences!: Table<IProjectPreference, string>;
    weeklyProjectPlans!: Table<IWeeklyProjectPlan, string>;
    settings!: Table<ICalendarSetting, string>;
    dailyBillableProjections!: Table<IDailyBillableProjection, string>;
    togglProjects!: Table<ITogglProjectStored, string>;
    togglTimeEntries!: Table<ITogglTimeEntryStored, number>;
    manualCompanies!: Table<IManualCompany, number>;
    manualProjects!: Table<IManualProject, number>;
    manualTimeEntries!: Table<IManualTimeEntry, string>;
    projectNotes!: Table<IProjectNote, string>;
    togglWorkspaces!: Table<ITogglWorkspaceStored, number>;

    constructor() {
        super("togglCalendarDatabase");
        this.version(1).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key"
        });
        this.version(2).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key",
            togglProjects: "key, workspace_id",
            togglTimeEntries: "id, [workspaceId+startDate]"
        });
        this.version(3).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key",
            dailyBillableProjections: "key, workspaceId, date, [workspaceId+date]",
            togglProjects: "key, workspace_id",
            togglTimeEntries: "id, [workspaceId+startDate]"
        });
        this.version(4).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key",
            dailyBillableProjections: "key, workspaceId, date, [workspaceId+date]",
            togglProjects: "key, workspace_id",
            togglTimeEntries: "id, [workspaceId+startDate]",
            manualCompanies: "++id",
            manualProjects: "++id, companyId",
            manualTimeEntries: "key, projectId, date"
        });
        this.version(5).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key",
            dailyBillableProjections: "key, workspaceId, date, [workspaceId+date]",
            togglProjects: "key, workspace_id",
            togglTimeEntries: "id, [workspaceId+startDate]",
            manualCompanies: "++id",
            manualProjects: "++id, companyId",
            manualTimeEntries: "key, projectId, date",
            projectNotes: "key, workspaceId, projectId, [workspaceId+projectId]"
        });
        this.version(6).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key",
            dailyBillableProjections: "key, workspaceId, date, [workspaceId+date]",
            togglProjects: "key, workspace_id",
            togglTimeEntries: "id, [workspaceId+startDate]",
            manualCompanies: "++id",
            manualProjects: "++id, companyId",
            manualTimeEntries: "key, projectId, date",
            projectNotes: "key, workspaceId, projectId, [workspaceId+projectId]",
            togglWorkspaces: "id"
        });
    }
}

export const BILLABLE_TARGET_SETTING_KEY = "billableHoursTargetPerWeek";
export const DEFAULT_BILLABLE_TARGET_HOURS = 40;

export const getProjectPreferenceKey = (workspaceId: number, projectId: number) =>
    `${workspaceId}:${projectId}`;

export const getWeeklyPlanKey = (workspaceId: number, weekStart: string, projectId: number) =>
    `${workspaceId}:${weekStart}:${projectId}`;

/** Weekly target for the total row (actual total hours vs target). Backwards compat: existing data is total target. */
export const getWeeklyTargetKey = (weekStart: string) =>
    `weeklyBillableTarget:${weekStart}`;

/** Weekly target for the billable row only. */
export const getWeeklyBillableTargetKey = (weekStart: string) =>
    `weeklyBillableRowTarget:${weekStart}`;

/** Weekly target for the non-billable row only. */
export const getWeeklyNonBillableTargetKey = (weekStart: string) =>
    `weeklyNonBillableTarget:${weekStart}`;

export const START_OF_YEAR_MONTH_KEY = "startOfYearMonth";
export const ANNUAL_TARGET_HOURS_KEY = "annualTargetHours";
export const ANNUAL_TARGET_PERCENTAGE_KEY = "annualTargetPercentage";
export const FULL_TIME_HOURS_KEY = "fullTimeHours";
export const DEFAULT_ANNUAL_TARGET_HOURS = 2080;
export const DEFAULT_FULL_TIME_HOURS = 2080;

export const getDailyBillableProjectionKey = (workspaceId: number, date: string) =>
    `${workspaceId}:${date}`;

export const getProjectNoteKey = (workspaceId: number, projectId: number) =>
    `${workspaceId}:${projectId}`;

export const calendarDb = new CalendarDatabase();
