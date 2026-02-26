import Dexie, {Table} from "dexie";

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

class CalendarDatabase extends Dexie {
    projectPreferences!: Table<IProjectPreference, string>;
    weeklyProjectPlans!: Table<IWeeklyProjectPlan, string>;
    settings!: Table<ICalendarSetting, string>;

    constructor() {
        super("togglCalendarDatabase");
        this.version(1).stores({
            projectPreferences: "key, workspaceId, projectId, [workspaceId+projectId]",
            weeklyProjectPlans: "key, workspaceId, weekStart, projectId, [workspaceId+weekStart], [workspaceId+weekStart+projectId]",
            settings: "key"
        });
    }
}

export const BILLABLE_TARGET_SETTING_KEY = "billableHoursTargetPerWeek";
export const DEFAULT_BILLABLE_TARGET_HOURS = 40;

export const getProjectPreferenceKey = (workspaceId: number, projectId: number) =>
    `${workspaceId}:${projectId}`;

export const getWeeklyPlanKey = (workspaceId: number, weekStart: string, projectId: number) =>
    `${workspaceId}:${weekStart}:${projectId}`;

export const calendarDb = new CalendarDatabase();
