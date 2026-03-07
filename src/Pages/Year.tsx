import React, {useCallback, useMemo, useState} from "react";
import {Layout} from "../Components/Layout";
import {useAppContext} from "../Utilities/AppContext";
import {useLiveQuery} from "dexie-react-hooks";
import dayjs from "dayjs";
import {
    calendarDb,
    getDailyBillableProjectionKey,
    ANNUAL_TARGET_HOURS_KEY,
    ANNUAL_TARGET_PERCENTAGE_KEY,
    DEFAULT_ANNUAL_TARGET_HOURS,
    MANUAL_WORKSPACE_ID,
    START_OF_YEAR_MONTH_KEY
} from "../Utilities/calendarDb";
import {getBillableHoursByDay, getSimpleDataFromDexie, BillableFilter} from "../Utilities/togglDetailsFromDexie";
import {getManualBillableHoursByDay, getManualSimpleData, getAllManualProjectsAsSingleProject} from "../Utilities/manualData";
import {getFiscalYearBounds, getFiscalYearMonthStarts} from "../Utilities/fiscalYear";
import {ConfigDialog} from "../Components/ConfigDialog";
import {syncDateRange} from "../Utilities/togglSync";
import {useTogglApiKey} from "../Utilities/useTogglApiKey";
import {useTogglUser} from "../Utilities/useTogglUser";
import {formatHours, formatHoursDisplay, projectLabel, FULL_TIME_HOURS, type ViewMode, type TimeDisplayMode} from "../Utilities/yearViewUtils";
import {YearProjectSelect} from "../Components/YearProjectSelect";
import {YearMonthCard} from "../Components/YearMonthCard";
import {YearEditDayDialog} from "../Components/YearEditDayDialog";
import {YearEditTargetDialog} from "../Components/YearEditTargetDialog";
import {ManualDayTimeDialog} from "../Components/ManualDayTimeDialog";
import {ManualCompanyProjectDialog} from "../Components/ManualCompanyProjectDialog";
import "./Year.css";

export const YearPage = () => {
    const {selectedWorkspace, dataMode, setDataMode} = useAppContext();
    const {togglApiKey} = useTogglApiKey();
    const {data: user} = useTogglUser();
    const isManual = dataMode === "manual";
    const workspaceId = isManual ? MANUAL_WORKSPACE_ID : (selectedWorkspace?.id ?? 0);

    const [viewMode, setViewMode] = useState<ViewMode>("projected");
    const [billableFilter, setBillableFilter] = useState<BillableFilter>("billable");
    const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("rounded");
    const [configOpen, setConfigOpen] = useState(false);
    const [editDay, setEditDay] = useState<{ date: string; hours: number } | null>(null);
    const [editTargetOpen, setEditTargetOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [manualDayEdit, setManualDayEdit] = useState<string | null>(null);
    const [manageOpen, setManageOpen] = useState(false);

    const projects = useLiveQuery(
        async () => {
            if (isManual) return getAllManualProjectsAsSingleProject();
            if (!workspaceId) return [];
            return calendarDb.togglProjects.where("workspace_id").equals(workspaceId).toArray();
        },
        [workspaceId, isManual],
        []
    );
    const projectsList = projects ?? [];

    const startOfYearSetting = useLiveQuery(
        () => calendarDb.settings.get(START_OF_YEAR_MONTH_KEY),
        [],
        undefined
    );
    const startMonth = Math.min(12, Math.max(1, startOfYearSetting?.value ?? 1));

    const fiscalYear = useMemo(
        () => getFiscalYearBounds(dayjs(), startMonth),
        [startMonth]
    );
    const {startKey: fyStartKey, endKey: fyEndKey} = fiscalYear;
    const monthStarts = useMemo(
        () => getFiscalYearMonthStarts(fiscalYear.start, fiscalYear.end),
        [fiscalYear.start, fiscalYear.end]
    );

    const annualTargetHoursSetting = useLiveQuery(
        () => calendarDb.settings.get(ANNUAL_TARGET_HOURS_KEY),
        [],
        undefined
    );
    const annualTargetPctSetting = useLiveQuery(
        () => calendarDb.settings.get(ANNUAL_TARGET_PERCENTAGE_KEY),
        [],
        undefined
    );
    const annualTargetHours = useMemo(() => {
        const pct = annualTargetPctSetting?.value;
        if (pct != null && pct > 0) return (pct / 100) * FULL_TIME_HOURS;
        return annualTargetHoursSetting?.value ?? DEFAULT_ANNUAL_TARGET_HOURS;
    }, [annualTargetHoursSetting?.value, annualTargetPctSetting?.value]);

    const dailyProjectionsInRange = useLiveQuery(
        async () => {
            const wsId = isManual ? MANUAL_WORKSPACE_ID : workspaceId;
            if (!wsId && !isManual) return [];
            return calendarDb.dailyBillableProjections
                .where("[workspaceId+date]")
                .between([wsId, fyStartKey], [wsId, fyEndKey], true, true)
                .toArray();
        },
        [workspaceId, fyStartKey, fyEndKey, isManual],
        []
    );
    const projectionsByDate = useMemo(() => {
        const map: Record<string, number> = {};
        (dailyProjectionsInRange ?? []).forEach((p) => {
            map[p.date] = p.projectedHours;
        });
        return map;
    }, [dailyProjectionsInRange]);

    const billableToDateData = useLiveQuery(
        async () => {
            if (!fyStartKey) return { byDay: {} as Record<string, number>, total: 0 };
            const today = dayjs().format("YYYY-MM-DD");
            if (isManual) return getManualBillableHoursByDay(fyStartKey, today, "billable");
            if (!workspaceId) return { byDay: {} as Record<string, number>, total: 0 };
            return getBillableHoursByDay(workspaceId, fyStartKey, today, "billable");
        },
        [workspaceId, fyStartKey, isManual],
        { byDay: {}, total: 0 }
    );
    const actualByDayAll = useLiveQuery(
        async () => {
            if (!fyStartKey || !fyEndKey) return { byDay: {} as Record<string, number>, total: 0 };
            if (isManual) return getManualBillableHoursByDay(fyStartKey, fyEndKey, billableFilter, selectedProjectId);
            if (!workspaceId) return { byDay: {} as Record<string, number>, total: 0 };
            return getBillableHoursByDay(workspaceId, fyStartKey, fyEndKey, billableFilter, selectedProjectId);
        },
        [workspaceId, fyStartKey, fyEndKey, billableFilter, selectedProjectId, isManual],
        { byDay: {}, total: 0 }
    );
    const billableHoursToDate = billableToDateData?.total ?? 0;
    const actualByDay = actualByDayAll?.byDay ?? {};

    const simpleDataForYear = useLiveQuery(
        async () => {
            if (!fyStartKey || !fyEndKey) return undefined;
            if (isManual) return getManualSimpleData(fyStartKey, fyEndKey);
            if (!workspaceId) return undefined;
            return getSimpleDataFromDexie(workspaceId, fyStartKey, fyEndKey);
        },
        [workspaceId, fyStartKey, fyEndKey, isManual],
        undefined
    );
    const projectPrefsList = useLiveQuery(
        async () => {
            const wsId = isManual ? MANUAL_WORKSPACE_ID : workspaceId;
            if (!wsId && !isManual) return [];
            return calendarDb.projectPreferences.where("workspaceId").equals(wsId).toArray();
        },
        [workspaceId, isManual],
        []
    ) as { projectId: number; billable: boolean }[] | undefined;
    const byDayByProject = useMemo((): Record<string, Array<{ label: string; hours: number }>> => {
        const simpleData = simpleDataForYear ?? {};
        const prefs = projectPrefsList ?? [];
        const prefsByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
            acc[p.projectId] = p.billable;
            return acc;
        }, {});
        const result: Record<string, Array<{ label: string; hours: number }>> = {};
        const projectIds = selectedProjectId != null ? [selectedProjectId] : Object.keys(simpleData).map(Number);
        const projectLabelFromSimple = (p: { project_name?: string; client_name?: string }) =>
            (p.client_name ? `${p.client_name} - ${p.project_name ?? ""}` : (p.project_name ?? ""));
        for (const pid of projectIds) {
            const project = simpleData[pid];
            if (!project?.dates) continue;
            const isBillable = prefsByProject[pid] ?? true;
            const include =
                billableFilter === "all" ||
                (billableFilter === "billable" && isBillable) ||
                (billableFilter === "nonBillable" && !isBillable);
            if (!include) continue;
            const label = projectLabelFromSimple(project);
            for (const [date, dayData] of Object.entries(project.dates)) {
                const hours = dayData.hours ?? 0;
                if (hours <= 0) continue;
                if (!result[date]) result[date] = [];
                result[date].push({ label, hours });
            }
        }
        return result;
    }, [simpleDataForYear, projectPrefsList, billableFilter, selectedProjectId]);

    const todayKey = dayjs().format("YYYY-MM-DD");
    const daysAvailable = useMemo(() => {
        let count = 0;
        const end = dayjs(fyEndKey);
        let d = dayjs(todayKey).add(1, "day");
        while (d.isBefore(end) || d.isSame(end, "day")) {
            const dow = d.day();
            if (dow !== 0 && dow !== 6) {
                const key = d.format("YYYY-MM-DD");
                const proj = projectionsByDate[key];
                if (proj === undefined || proj > 0) count++;
            }
            d = d.add(1, "day");
        }
        return count;
    }, [fyEndKey, todayKey, projectionsByDate]);

    const hoursRemaining = Math.max(0, annualTargetHours - billableHoursToDate);
    const dailyTarget = daysAvailable > 0 ? hoursRemaining / daysAvailable : 0;
    const weeklyTarget = dailyTarget * 5;

    const progressPct = annualTargetHours > 0
        ? Math.min(100, (billableHoursToDate / annualTargetHours) * 100)
        : 0;

    const effectiveWsId = isManual ? MANUAL_WORKSPACE_ID : workspaceId;
    const upsertDailyProjection = useCallback(
        async (date: string, hours: number) => {
            if (!effectiveWsId && !isManual) return;
            const key = getDailyBillableProjectionKey(effectiveWsId, date);
            if (hours === 8) {
                await calendarDb.dailyBillableProjections.delete(key);
                return;
            }
            await calendarDb.dailyBillableProjections.put({
                key,
                workspaceId: effectiveWsId,
                date,
                projectedHours: Math.max(0, hours),
                updatedAt: Date.now()
            });
        },
        [effectiveWsId, isManual]
    );

    const handleSyncYear = useCallback(async () => {
        if (!togglApiKey || !user?.id || !workspaceId) return;
        setIsSyncing(true);
        try {
            await syncDateRange(
                togglApiKey,
                user.id,
                workspaceId,
                dayjs(fyStartKey),
                dayjs(fyEndKey)
            );
        } finally {
            setIsSyncing(false);
        }
    }, [togglApiKey, user?.id, workspaceId, fyStartKey, fyEndKey]);

    const handleEditDayClose = useCallback(
        (confirmed: boolean, newHours?: number) => {
            if (editDay && confirmed && newHours !== undefined) {
                void upsertDailyProjection(editDay.date, newHours);
            }
            setEditDay(null);
        },
        [editDay, upsertDailyProjection]
    );

    if (!isManual && !selectedWorkspace) {
        return (
            <Layout>
                <div className={"yearWelcome"}>
                    <h2>Annual view</h2>
                    <p>Select a workspace in Config to see your fiscal year and targets, or switch to Manual mode.</p>
                    <button type={"button"} onClick={() => setConfigOpen(true)}>
                        Open Config
                    </button>
                    <button type={"button"} onClick={() => setDataMode("manual")} style={{marginLeft: 8}}>
                        Use Manual Entry
                    </button>
                </div>
                <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)}/>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={"yearPage"}>
                <div className={"yearHeader"}>
                    <h2>FY{fiscalYear.label} — {fiscalYear.start.format("MMM D, YYYY")} – {fiscalYear.end.format("MMM D, YYYY")}</h2>
                    <div className={"yearControls"}>
                        <div className={"calendarDisplayButtonGroup"}>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${viewMode === "projected" ? "selected" : ""}`}
                                onClick={() => setViewMode("projected")}
                            >
                                Projected
                            </button>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${viewMode === "actual" ? "selected" : ""}`}
                                onClick={() => setViewMode("actual")}
                            >
                                Actual
                            </button>
                        </div>
                        <div className={"calendarDisplayButtonGroup"}>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${billableFilter === "billable" ? "selected" : ""}`}
                                onClick={() => setBillableFilter("billable")}
                            >
                                Billable
                            </button>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${billableFilter === "nonBillable" ? "selected" : ""}`}
                                onClick={() => setBillableFilter("nonBillable")}
                            >
                                Non-billable
                            </button>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${billableFilter === "all" ? "selected" : ""}`}
                                onClick={() => setBillableFilter("all")}
                            >
                                All
                            </button>
                        </div>
                        <div className={"calendarDisplayButtonGroup"}>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${timeDisplayMode === "rounded" ? "selected" : ""}`}
                                onClick={() => setTimeDisplayMode("rounded")}
                            >
                                Rounded
                            </button>
                            <button
                                type={"button"}
                                className={`calendarHeaderButton ${timeDisplayMode === "actual" ? "selected" : ""}`}
                                onClick={() => setTimeDisplayMode("actual")}
                            >
                                Actual
                            </button>
                        </div>
                        <YearProjectSelect
                            projects={[...projectsList].sort((a, b) => projectLabel(a).localeCompare(projectLabel(b)))}
                            value={selectedProjectId}
                            onChange={setSelectedProjectId}
                            title={"Filter by project"}
                        />
                        {isManual && (
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={() => setManageOpen(true)}
                            >
                                Manage Projects
                            </button>
                        )}
                        {!isManual && (
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={handleSyncYear}
                                disabled={isSyncing}
                            >
                                {isSyncing ? "Syncing…" : "Sync year"}
                            </button>
                        )}
                    </div>
                </div>

                <div className={"yearMetrics"}>
                    <div className={"yearMetricsBar"}>
                        <div className={"yearProgressTrack"}>
                            <div
                                className={"yearProgressFill"}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <button
                            type={"button"}
                            className={"calendarHeaderButton"}
                            onClick={() => setEditTargetOpen(true)}
                        >
                            Edit target
                        </button>
                    </div>
                    <div className={"metricLegend"}>
                        <span><strong>Billable to date:</strong> {formatHours(billableHoursToDate, timeDisplayMode)}</span>
                        <span><strong>Annual target:</strong> {formatHours(annualTargetHours, timeDisplayMode)}</span>
                    </div>
                    <div className={"yearTargets"}>
                        <span><strong>Daily target:</strong> {formatHours(dailyTarget, timeDisplayMode)}</span>
                        <span><strong>Weekly target:</strong> {formatHours(weeklyTarget, timeDisplayMode)}</span>
                        <span className={"configHint"}>Based on {daysAvailable} working days remaining</span>
                    </div>
                </div>

                <div className={"yearGrid"}>
                    {monthStarts.map((monthStart) => (
                        <YearMonthCard
                            key={monthStart.format("YYYY-MM")}
                            monthStart={monthStart}
                            fiscalYear={fiscalYear}
                            viewMode={viewMode}
                            billableFilter={billableFilter}
                            projectionsByDate={projectionsByDate}
                            actualByDay={actualByDay}
                            byDayByProject={byDayByProject}
                            timeDisplayMode={timeDisplayMode}
                            onEditProjection={
                                viewMode === "projected"
                                    ? (date, hours) => setEditDay({ date, hours })
                                    : (isManual && viewMode === "actual")
                                        ? (date) => setManualDayEdit(date)
                                        : undefined
                            }
                        />
                    ))}
                </div>
            </div>

            {editDay && (
                <YearEditDayDialog
                    key={editDay.date}
                    date={editDay.date}
                    hours={editDay.hours}
                    onClose={handleEditDayClose}
                />
            )}
            {editTargetOpen && (
                <YearEditTargetDialog
                    annualTargetHours={annualTargetHours}
                    annualTargetPct={annualTargetPctSetting?.value}
                    onClose={() => setEditTargetOpen(false)}
                />
            )}
            {manualDayEdit && (
                <ManualDayTimeDialog
                    key={manualDayEdit}
                    date={manualDayEdit}
                    onClose={() => setManualDayEdit(null)}
                />
            )}
            <ManualCompanyProjectDialog open={manageOpen} onClose={() => setManageOpen(false)}/>
        </Layout>
    );
};
