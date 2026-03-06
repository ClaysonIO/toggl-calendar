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
    START_OF_YEAR_MONTH_KEY
} from "../Utilities/calendarDb";
import {getBillableHoursByDay, BillableFilter} from "../Utilities/togglDetailsFromDexie";
import {getFiscalYearBounds, getFiscalYearMonthStarts} from "../Utilities/fiscalYear";
import {ConfigDialog} from "../Components/ConfigDialog";
import {syncDateRange} from "../Utilities/togglSync";
import {useTogglApiKey} from "../Utilities/useTogglApiKey";
import {useTogglUser} from "../Utilities/useTogglUser";
import {DecimalToRoundedTime} from "../Utilities/Functions/DecimalToRoundedTime";
import "./Year.css";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_TIME_HOURS = 2080;

type ViewMode = "projected" | "actual";
type TimeDisplayMode = "rounded" | "actual";

const formatHours = (hours: number, mode: TimeDisplayMode) =>
    mode === "actual"
        ? `${Math.floor(hours)}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`
        : DecimalToRoundedTime(hours);

/** Like formatHours but drops trailing .00 for rounded mode (e.g. "8" not "8.00"). */
const formatHoursDisplay = (hours: number, mode: TimeDisplayMode): string => {
    const s = formatHours(hours, mode);
    if (mode === "rounded" && s.endsWith(".00")) return s.slice(0, -3);
    return s;
};

export const YearPage = () => {
    const {selectedWorkspace} = useAppContext();
    const {togglApiKey} = useTogglApiKey();
    const {data: user} = useTogglUser();
    const workspaceId = selectedWorkspace?.id ?? 0;

    const [viewMode, setViewMode] = useState<ViewMode>("projected");
    const [billableFilter, setBillableFilter] = useState<BillableFilter>("billable");
    const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("rounded");
    const [configOpen, setConfigOpen] = useState(false);
    const [editDay, setEditDay] = useState<{ date: string; hours: number } | null>(null);
    const [editTargetOpen, setEditTargetOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    const projects = useLiveQuery(
        async () => {
            if (!workspaceId) return [];
            return calendarDb.togglProjects.where("workspace_id").equals(workspaceId).toArray();
        },
        [workspaceId],
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
            if (!workspaceId) return [];
            return calendarDb.dailyBillableProjections
                .where("[workspaceId+date]")
                .between([workspaceId, fyStartKey], [workspaceId, fyEndKey], true, true)
                .toArray();
        },
        [workspaceId, fyStartKey, fyEndKey],
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
            if (!workspaceId || !fyStartKey) return { byDay: {} as Record<string, number>, total: 0 };
            const today = dayjs().format("YYYY-MM-DD");
            return getBillableHoursByDay(workspaceId, fyStartKey, today, "billable");
        },
        [workspaceId, fyStartKey],
        { byDay: {}, total: 0 }
    );
    const actualByDayAll = useLiveQuery(
        async () => {
            if (!workspaceId || !fyStartKey || !fyEndKey) return { byDay: {} as Record<string, number>, total: 0 };
            return getBillableHoursByDay(workspaceId, fyStartKey, fyEndKey, billableFilter, selectedProjectId);
        },
        [workspaceId, fyStartKey, fyEndKey, billableFilter, selectedProjectId],
        { byDay: {}, total: 0 }
    );
    const billableHoursToDate = billableToDateData?.total ?? 0;
    const actualByDay = actualByDayAll?.byDay ?? {};

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

    const upsertDailyProjection = useCallback(
        async (date: string, hours: number) => {
            if (!workspaceId) return;
            const key = getDailyBillableProjectionKey(workspaceId, date);
            if (hours === 8) {
                await calendarDb.dailyBillableProjections.delete(key);
                return;
            }
            await calendarDb.dailyBillableProjections.put({
                key,
                workspaceId,
                date,
                projectedHours: Math.max(0, hours),
                updatedAt: Date.now()
            });
        },
        [workspaceId]
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

    if (!selectedWorkspace) {
        return (
            <Layout>
                <div className={"yearWelcome"}>
                    <h2>Annual view</h2>
                    <p>Select a workspace in Config to see your fiscal year and targets.</p>
                    <button type={"button"} onClick={() => setConfigOpen(true)}>
                        Open Config
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
                        <select
                            className={"yearProjectSelect"}
                            value={selectedProjectId ?? ""}
                            onChange={(e) => setSelectedProjectId(e.target.value === "" ? null : Number(e.target.value))}
                            title={"Filter by project"}
                        >
                            <option value="">All projects</option>
                            {projectsList.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            type={"button"}
                            className={"calendarHeaderButton"}
                            onClick={handleSyncYear}
                            disabled={isSyncing}
                        >
                            {isSyncing ? "Syncing…" : "Sync year"}
                        </button>
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
                            timeDisplayMode={timeDisplayMode}
                            onEditProjection={viewMode === "projected" ? (date, hours) => setEditDay({ date, hours }) : undefined}
                        />
                    ))}
                </div>
            </div>

            {editDay && (
                <YearEditDayDialog
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
        </Layout>
    );
};

function YearMonthCard({
    monthStart,
    fiscalYear,
    viewMode,
    billableFilter,
    projectionsByDate,
    actualByDay,
    timeDisplayMode,
    onEditProjection
}: {
    monthStart: dayjs.Dayjs;
    fiscalYear: { start: dayjs.Dayjs; end: dayjs.Dayjs };
    viewMode: ViewMode;
    billableFilter: BillableFilter;
    projectionsByDate: Record<string, number>;
    actualByDay: Record<string, number>;
    timeDisplayMode: TimeDisplayMode;
    onEditProjection?: (date: string, hours: number) => void;
}) {
    const monthEnd = monthStart.endOf("month");
    const calendarStart = monthStart.startOf("week");
    const calendarEnd = monthEnd.endOf("week");
    const days: { date: dayjs.Dayjs; isThisMonth: boolean }[] = [];
    let d = calendarStart;
    while (d.isBefore(calendarEnd) || d.isSame(calendarEnd, "day")) {
        days.push({
            date: d,
            isThisMonth: d.month() === monthStart.month()
        });
        d = d.add(1, "day");
    }
    const todayKey = dayjs().format("YYYY-MM-DD");
    const rowCount = Math.ceil(days.length / 7);

    return (
        <div className={"yearMonthCard"}>
            <div className={"yearMonthTitle"}>{monthStart.format("MMMM YYYY")}</div>
            <div className={"yearMonthGrid"}>
                {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className={"yearMonthWeekday"}>{label}</div>
                ))}
                <div className={"yearMonthWeekday yearWeekTotalHeader"}>Total</div>
                {Array.from({ length: rowCount }, (_, rowIndex) => {
                    const rowDays = days.slice(rowIndex * 7, rowIndex * 7 + 7);
                    const weekTotal = rowDays.reduce(
                        (sum, { date }) => sum + (actualByDay[date.format("YYYY-MM-DD")] ?? 0),
                        0
                    );
                    return (
                        <React.Fragment key={rowIndex}>
                            {rowDays.map(({ date, isThisMonth }) => {
                                const key = date.format("YYYY-MM-DD");
                                const inRange = (date.isAfter(fiscalYear.start) || date.isSame(fiscalYear.start, "day")) &&
                                    (date.isBefore(fiscalYear.end) || date.isSame(fiscalYear.end, "day"));
                                const isWeekday = date.day() !== 0 && date.day() !== 6;
                                const projectedVal = isWeekday
                                    ? (projectionsByDate[key] ?? 8)
                                    : 0;
                                const projectionExplicitZero = projectedVal === 0;
                                const actualHours = actualByDay[key] ?? 0;
                                const hours = viewMode === "projected" ? projectedVal : actualHours;
                                const isToday = key === todayKey;
                                const isPast = key < todayKey;
                                const editable = viewMode === "projected" && inRange && onEditProjection != null;
                                const editDefaultHours = projectedVal > 0 ? projectedVal : (isWeekday ? 8 : 0);

                                const showGrey = viewMode === "projected" && projectionExplicitZero;
                                const showGreen = isPast && actualHours > 0;
                                const greenIntensity = showGreen ? Math.min(1, actualHours / 8) : 0;

                                return (
                                    <div
                                        key={key}
                                        className={[
                                            "yearDayCell",
                                            !isThisMonth ? "otherMonth" : "",
                                            showGrey ? "zeroHours" : "",
                                            showGreen ? "hasActual" : "",
                                            editable ? "editable" : "",
                                            isToday ? "today" : ""
                                        ].filter(Boolean).join(" ")}
                                        data-billable-mode={showGreen ? billableFilter : undefined}
                                        style={showGreen ? { ["--actual-intensity" as string]: greenIntensity } as React.CSSProperties : undefined}
                                        onClick={editable ? () => onEditProjection(key, editDefaultHours) : undefined}
                                        title={editable ? "Click to set hours" : `${key}: ${hours > 0 ? formatHours(hours, timeDisplayMode) : "0"}`}
                                    >
                                        <span className={"yearDayNum"}>{date.date()}</span>
                                        {isThisMonth && inRange && hours > 0 && hours !== 8 && (
                                            <span className={"yearDayHours yearHoursBadge"}>{formatHoursDisplay(hours, timeDisplayMode)}</span>
                                        )}
                                    </div>
                                );
                            })}
                            <div key={`total-${rowIndex}`} className={"yearDayCell yearWeekTotalCell"} title={"Weekly worked hours"}>
                                {weekTotal > 0 ? formatHoursDisplay(weekTotal, timeDisplayMode) : ""}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

function YearEditDayDialog({
    date,
    hours,
    onClose
}: {
    date: string;
    hours: number;
    onClose: (confirmed: boolean, newHours?: number) => void;
}) {
    const [value, setValue] = useState(String(hours));
    const handleSubmit = () => {
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        onClose(true, safe);
    };
    return (
        <div className={"yearEditDayPopup"} onClick={() => onClose(false)}>
            <div className={"yearEditDayContent"} onClick={(e) => e.stopPropagation()}>
                <label htmlFor={"yearEditDayInput"}>Hours for {dayjs(date).format("MMM D, YYYY")}</label>
                <input
                    id={"yearEditDayInput"}
                    type={"number"}
                    min={0}
                    step={0.25}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmit();
                        if (e.key === "Escape") onClose(false);
                    }}
                />
                <div className={"yearEditDayActions"}>
                    <button type={"button"} onClick={() => onClose(false)}>Cancel</button>
                    <button type={"button"} className={"primary"} onClick={handleSubmit}>Save</button>
                </div>
            </div>
        </div>
    );
}

function YearEditTargetDialog({
    annualTargetHours,
    annualTargetPct,
    onClose
}: {
    annualTargetHours: number;
    annualTargetPct?: number;
    onClose: () => void;
}) {
    const [hoursInput, setHoursInput] = useState(String(annualTargetHours));
    const [pctInput, setPctInput] = useState(
        annualTargetPct != null ? String(annualTargetPct) : String(Math.round((annualTargetHours / FULL_TIME_HOURS) * 100))
    );

    const handleSave = async () => {
        const hours = Number(hoursInput);
        const pct = Number(pctInput);
        const now = Date.now();
        if (Number.isFinite(hours) && hours >= 0) {
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_HOURS_KEY,
                value: hours,
                updatedAt: now
            });
            const derivedPct = Math.round((hours / FULL_TIME_HOURS) * 100);
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_PERCENTAGE_KEY,
                value: Math.min(100, Math.max(0, derivedPct)),
                updatedAt: now
            });
        } else if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
            const derivedHours = (pct / 100) * FULL_TIME_HOURS;
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_HOURS_KEY,
                value: Math.round(derivedHours),
                updatedAt: now
            });
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_PERCENTAGE_KEY,
                value: pct,
                updatedAt: now
            });
        }
        onClose();
    };

    return (
        <div className={"yearEditDayPopup"} onClick={onClose}>
            <div className={"yearEditDayContent"} onClick={(e) => e.stopPropagation()} style={{ minWidth: 280 }}>
                <h3 style={{ marginTop: 0 }}>Annual target</h3>
                <label htmlFor={"yearTargetHours"}>Hours per year</label>
                <input
                    id={"yearTargetHours"}
                    type={"number"}
                    min={0}
                    step={1}
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                />
                <label htmlFor={"yearTargetPct"}>% of 2080</label>
                <input
                    id={"yearTargetPct"}
                    type={"number"}
                    min={0}
                    max={100}
                    step={1}
                    value={pctInput}
                    onChange={(e) => setPctInput(e.target.value)}
                />
                <div className={"yearEditDayActions"} style={{ marginTop: 12 }}>
                    <button type={"button"} onClick={onClose}>Cancel</button>
                    <button type={"button"} className={"primary"} onClick={() => void handleSave()}>Save</button>
                </div>
            </div>
        </div>
    );
}
