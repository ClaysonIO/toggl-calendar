import dayjs from "dayjs";
import {
    calendarDb,
    ANNUAL_TARGET_HOURS_KEY,
    ANNUAL_TARGET_PERCENTAGE_KEY,
    FULL_TIME_HOURS_KEY,
    DEFAULT_ANNUAL_TARGET_HOURS,
    DEFAULT_FULL_TIME_HOURS,
    MANUAL_WORKSPACE_ID,
    START_OF_YEAR_MONTH_KEY
} from "./calendarDb";
import {getFiscalYearBounds} from "./fiscalYear";
import {getBillableHoursByDay} from "./togglDetailsFromDexie";
import {getManualBillableHoursByDay} from "./manualData";

/** Default projected hours for a weekday with no explicit projection on the year page. */
export const DEFAULT_DAILY_PROJECTED_HOURS = 8;

const isWeekend = (date: string) => {
    const dow = dayjs(date).day();
    return dow === 0 || dow === 6;
};

/** Projected hours for a day as shown on the year page (weekdays default to 8, weekends to 0). */
export const getProjectedHoursForDay = (date: string, projectionsByDate: Record<string, number>) => {
    const explicit = projectionsByDate[date];
    if (explicit !== undefined) return explicit;
    return isWeekend(date) ? 0 : DEFAULT_DAILY_PROJECTED_HOURS;
};

/** A working day is a weekday that has not been projected as 0 hours on the year page. */
export const isWorkingDay = (date: string, projectionsByDate: Record<string, number>) => {
    if (isWeekend(date)) return false;
    const proj = projectionsByDate[date];
    return proj === undefined || proj > 0;
};

/**
 * Compute default weekly targets from the year page:
 * - billable: working days in the week × the year page's daily billable target
 * - total: sum of the year page's projected hours for each day of the week
 */
export async function getWeekTargetDefaults(
    workspaceId: number,
    isManual: boolean,
    dateKeys: string[]
): Promise<{ billable: number; total: number }> {
    if (!dateKeys.length || (!isManual && !workspaceId)) return {billable: 0, total: 0};
    const wsId = isManual ? MANUAL_WORKSPACE_ID : workspaceId;

    const [startMonthSetting, annualHoursSetting, annualPctSetting, fullTimeSetting] = await Promise.all([
        calendarDb.settings.get(START_OF_YEAR_MONTH_KEY),
        calendarDb.settings.get(ANNUAL_TARGET_HOURS_KEY),
        calendarDb.settings.get(ANNUAL_TARGET_PERCENTAGE_KEY),
        calendarDb.settings.get(FULL_TIME_HOURS_KEY)
    ]);
    const startMonth = Math.min(12, Math.max(1, startMonthSetting?.value ?? 1));
    const fullTimeHours = fullTimeSetting?.value ?? DEFAULT_FULL_TIME_HOURS;
    const pct = annualPctSetting?.value;
    const annualBillableTarget = pct != null && pct > 0
        ? (pct / 100) * fullTimeHours
        : (annualHoursSetting?.value ?? DEFAULT_ANNUAL_TARGET_HOURS);

    // Fiscal year containing the week (same year the year page shows for these dates)
    const {startKey: fyStartKey, endKey: fyEndKey} = getFiscalYearBounds(dayjs(dateKeys[0]), startMonth);
    const firstKey = dateKeys[0] < fyStartKey ? dateKeys[0] : fyStartKey;
    const lastKey = dateKeys[dateKeys.length - 1] > fyEndKey ? dateKeys[dateKeys.length - 1] : fyEndKey;

    const projections = await calendarDb.dailyBillableProjections
        .where("[workspaceId+date]")
        .between([wsId, firstKey], [wsId, lastKey], true, true)
        .toArray();
    const projectionsByDate: Record<string, number> = {};
    projections.forEach((p) => {
        projectionsByDate[p.date] = p.projectedHours;
    });

    // Daily billable target, computed as on the year page
    const {byDay} = isManual
        ? await getManualBillableHoursByDay(fyStartKey, fyEndKey, "billable")
        : await getBillableHoursByDay(workspaceId, fyStartKey, fyEndKey, "billable");
    const todayKey = dayjs().format("YYYY-MM-DD");
    const toDate = todayKey <= fyEndKey ? todayKey : fyEndKey;
    let hoursToDate = 0;
    let daysAvailable = 0;
    for (let d = dayjs(fyStartKey); !d.isAfter(dayjs(fyEndKey), "day"); d = d.add(1, "day")) {
        const key = d.format("YYYY-MM-DD");
        if (key <= toDate) hoursToDate += byDay[key] ?? 0;
        else if (isWorkingDay(key, projectionsByDate)) daysAvailable++;
    }
    const hoursRemaining = Math.max(0, annualBillableTarget - hoursToDate);
    const dailyTarget = daysAvailable > 0 ? hoursRemaining / daysAvailable : 0;

    const workingDays = dateKeys.filter((date) => isWorkingDay(date, projectionsByDate)).length;
    const total = dateKeys.reduce((sum, date) => sum + getProjectedHoursForDay(date, projectionsByDate), 0);

    return {billable: workingDays * dailyTarget, total};
}
