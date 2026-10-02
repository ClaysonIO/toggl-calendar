import React, {useCallback, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import Dexie from "dexie";
import dayjs from "dayjs";
import {useLiveQuery} from "dexie-react-hooks";
import {Layout} from "../Components/Layout";
import {ConfigDialog} from "../Components/ConfigDialog";
import {useAppContext} from "../Utilities/AppContext";
import {
    calendarDb,
    ANNUAL_TARGET_HOURS_KEY,
    ANNUAL_TARGET_PERCENTAGE_KEY,
    DEFAULT_ANNUAL_TARGET_HOURS,
    DEFAULT_FULL_TIME_HOURS,
    FULL_TIME_HOURS_KEY,
    MANUAL_WORKSPACE_ID,
    MULTI_YEAR_FIRST_YEAR_KEY,
    START_OF_YEAR_MONTH_KEY
} from "../Utilities/calendarDb";
import {getSimpleDataFromDexie, BillableFilter} from "../Utilities/togglDetailsFromDexie";
import {getManualSimpleData} from "../Utilities/manualData";
import {getFiscalYearBounds, getFiscalYearBoundsForLabel} from "../Utilities/fiscalYear";
import {syncDateRange} from "../Utilities/togglSync";
import {useTogglApiKey} from "../Utilities/useTogglApiKey";
import {useTogglUser} from "../Utilities/useTogglUser";
import {formatHoursDisplay, type TimeDisplayMode} from "../Utilities/yearViewUtils";
import {buildYearSummaries, IYearSummary, NO_CLIENT_LABEL, pickHours} from "../Utilities/multiYearSummary";
import "./Years.css";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_YEARS_SHOWN = 3;
const MAX_YEARS_BACK = 15;
const TOP_CLIENT_COUNT = 8;
const FILTER_LABELS: Record<BillableFilter, string> = {
    billable: "billable",
    nonBillable: "non-billable",
    all: "all"
};

const formatPct = (value: number) => `${Math.round(value)}%`;

/** Hours the year would end at if the current daily rate holds. */
const yearPace = (y: IYearSummary) => {
    if (!y.isCurrent || y.elapsedDays <= 0) return y.hours.all;
    const daysInYear = dayjs(y.endKey).diff(dayjs(y.startKey), "day") + 1;
    return (y.hours.all / y.elapsedDays) * daysInYear;
};

export const YearsPage = () => {
    const {selectedWorkspace, dataMode, setDataMode} = useAppContext();
    const {togglApiKey, togglCredentials} = useTogglApiKey();
    const {data: user} = useTogglUser();
    const isManual = dataMode === "manual";
    const workspaceId = isManual ? MANUAL_WORKSPACE_ID : (selectedWorkspace?.id ?? 0);

    const [billableFilter, setBillableFilter] = useState<BillableFilter>("all");
    const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("rounded");
    const [configOpen, setConfigOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [syncError, setSyncError] = useState(false);

    const settings = useLiveQuery(
        async () => {
            const rows = await calendarDb.settings.bulkGet([
                START_OF_YEAR_MONTH_KEY,
                ANNUAL_TARGET_HOURS_KEY,
                ANNUAL_TARGET_PERCENTAGE_KEY,
                FULL_TIME_HOURS_KEY,
                MULTI_YEAR_FIRST_YEAR_KEY
            ]);
            return rows.map(r => r?.value);
        },
        [],
        []
    ) ?? [];
    const [startMonthSetting, annualTargetHoursSetting, annualTargetPctSetting, fullTimeHoursSetting, firstYearSetting] = settings;
    const startMonth = Math.min(12, Math.max(1, startMonthSetting ?? 1));
    const fullTimeHours = fullTimeHoursSetting ?? DEFAULT_FULL_TIME_HOURS;
    const billableTargetHours = annualTargetPctSetting != null && annualTargetPctSetting > 0
        ? (annualTargetPctSetting / 100) * fullTimeHours
        : (annualTargetHoursSetting ?? DEFAULT_ANNUAL_TARGET_HOURS);

    const todayKey = dayjs().format("YYYY-MM-DD");
    const currentLabel = Number(getFiscalYearBounds(dayjs(), startMonth).label);

    /** Earliest stored entry date, used to default the first year shown. */
    const earliestDate = useLiveQuery(
        async () => {
            if (isManual) return (await calendarDb.manualTimeEntries.orderBy("date").first())?.date ?? null;
            if (!workspaceId) return null;
            const first = await calendarDb.togglTimeEntries
                .where("[workspaceId+startDate]")
                .between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey])
                .first();
            return first?.startDate ?? null;
        },
        [workspaceId, isManual],
        undefined
    );
    const earliestLabel = earliestDate ? Number(getFiscalYearBounds(dayjs(earliestDate), startMonth).label) : null;
    const firstLabel = Math.min(
        currentLabel,
        firstYearSetting ?? earliestLabel ?? currentLabel - (DEFAULT_YEARS_SHOWN - 1)
    );

    const years = useMemo(() => {
        const list: Array<{label: number; startKey: string; endKey: string}> = [];
        for (let label = firstLabel; label <= currentLabel; label++) {
            const {startKey, endKey} = getFiscalYearBoundsForLabel(label, startMonth);
            list.push({label, startKey, endKey});
        }
        return list;
    }, [firstLabel, currentLabel, startMonth]);
    const rangeStartKey = years[0]?.startKey ?? todayKey;
    const rangeEndKey = years[years.length - 1]?.endKey ?? todayKey;

    const summaries = useLiveQuery(
        async () => {
            if (!isManual && !workspaceId) return [];
            const [simpleData, prefs] = await Promise.all([
                isManual
                    ? getManualSimpleData(rangeStartKey, rangeEndKey)
                    : getSimpleDataFromDexie(workspaceId, rangeStartKey, rangeEndKey),
                calendarDb.projectPreferences.where("workspaceId").equals(workspaceId).toArray()
            ]);
            const billableByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
                acc[p.projectId] = p.billable;
                return acc;
            }, {});
            return buildYearSummaries(simpleData ?? {}, billableByProject, years, startMonth, todayKey);
        },
        [workspaceId, isManual, rangeStartKey, rangeEndKey, years, startMonth, todayKey],
        undefined
    );

    const setFirstYear = useCallback(async (label: number) => {
        await calendarDb.settings.put({key: MULTI_YEAR_FIRST_YEAR_KEY, value: label, updatedAt: Date.now()});
    }, []);

    const handleSyncAll = useCallback(async () => {
        if (!togglApiKey || !user?.id || !workspaceId) return;
        setSyncError(false);
        try {
            for (const y of years) {
                setSyncStatus(`Syncing FY${y.label}…`);
                await syncDateRange(togglCredentials, user.id, workspaceId, dayjs(y.startKey), dayjs(y.endKey));
            }
        } catch {
            setSyncError(true);
        } finally {
            setSyncStatus(null);
        }
    }, [togglApiKey, togglCredentials, user?.id, workspaceId, years]);

    const fmt = useCallback((h: number) => formatHoursDisplay(h, timeDisplayMode), [timeDisplayMode]);

    if (!isManual && !selectedWorkspace) {
        return (
            <Layout>
                <div className={"yearsWelcome"}>
                    <h2>All years</h2>
                    <p>Select a workspace in Config to see your hours year by year, or switch to Manual mode.</p>
                    <button type={"button"} onClick={() => setConfigOpen(true)}>Open Config</button>
                    <button type={"button"} onClick={() => setDataMode("manual")} style={{marginLeft: 8}}>
                        Use Manual Entry
                    </button>
                </div>
                <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)}/>
            </Layout>
        );
    }

    const fiscalMonthLabels = Array.from({length: 12}, (_, i) => MONTH_SHORT[(startMonth - 1 + i) % 12]);
    const firstYearOptions = Array.from({length: MAX_YEARS_BACK + 1}, (_, i) => currentLabel - MAX_YEARS_BACK + i);
    if (!firstYearOptions.includes(firstLabel)) firstYearOptions.unshift(firstLabel);

    return (
        <Layout>
            <div className={"yearsPage"}>
                <div className={"yearsHeader"}>
                    <h2>All years — FY{firstLabel} to FY{currentLabel}</h2>
                    <div className={"yearsControls"}>
                        <label className={"yearsFromLabel"}>
                            From
                            <select
                                value={firstLabel}
                                onChange={e => void setFirstYear(Number(e.target.value))}
                                aria-label={"First fiscal year shown"}
                            >
                                {firstYearOptions.map(label => (
                                    <option key={label} value={label}>FY{label}</option>
                                ))}
                            </select>
                        </label>
                        <div className={"calendarDisplayButtonGroup"}>
                            {(["all", "billable", "nonBillable"] as BillableFilter[]).map(f => (
                                <button
                                    key={f}
                                    type={"button"}
                                    className={`calendarHeaderButton ${billableFilter === f ? "selected" : ""}`}
                                    onClick={() => setBillableFilter(f)}
                                >
                                    {f === "all" ? "All" : f === "billable" ? "Billable" : "Non-billable"}
                                </button>
                            ))}
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
                        {!isManual && (
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={handleSyncAll}
                                disabled={syncStatus != null}
                                title={"Pull time entries from Toggl for every year shown"}
                            >
                                {syncStatus ?? `Sync ${years.length} year${years.length === 1 ? "" : "s"}`}
                            </button>
                        )}
                    </div>
                </div>
                {syncError && <p className={"yearsError"}>Sync failed. Try again in a moment.</p>}

                {summaries === undefined ? (
                    <p className={"configHint"}>Loading…</p>
                ) : (
                    <>
                        <YearsKpis summaries={summaries} fmt={fmt}/>
                        <section className={"yearsSection"}>
                            <h3>Hours by year</h3>
                            <YearsChart summaries={summaries} billableTargetHours={billableTargetHours} fmt={fmt}/>
                        </section>
                        <section className={"yearsSection"}>
                            <h3>Year summary</h3>
                            <YearsTable summaries={summaries} billableTargetHours={billableTargetHours} fmt={fmt}/>
                        </section>
                        <section className={"yearsSection"}>
                            <h3>Monthly {FILTER_LABELS[billableFilter]} hours</h3>
                            <YearsHeatmap
                                summaries={summaries}
                                monthLabels={fiscalMonthLabels}
                                filter={billableFilter}
                                todayKey={todayKey}
                                fmt={fmt}
                            />
                        </section>
                        <section className={"yearsSection"}>
                            <h3>Top clients ({FILTER_LABELS[billableFilter]} hours)</h3>
                            <YearsClients summaries={summaries} filter={billableFilter} fmt={fmt}/>
                        </section>
                    </>
                )}
            </div>
        </Layout>
    );
};

type Fmt = (hours: number) => string;

function YearsKpis({summaries, fmt}: {summaries: IYearSummary[]; fmt: Fmt}) {
    const total = summaries.reduce((s, y) => s + y.hours.all, 0);
    const billable = summaries.reduce((s, y) => s + y.hours.billable, 0);
    const completed = summaries.filter(y => !y.isCurrent && y.hours.all > 0);
    const avgCompleted = completed.length ? completed.reduce((s, y) => s + y.hours.all, 0) / completed.length : null;
    const best = completed.reduce<IYearSummary | null>((b, y) => (!b || y.hours.all > b.hours.all ? y : b), null);
    const current = summaries.find(y => y.isCurrent);

    return (
        <div className={"yearsKpis"}>
            <div className={"yearsKpi"}>
                <span className={"yearsKpiLabel"}>Total hours</span>
                <span className={"yearsKpiValue"}>{fmt(total)}</span>
                <span className={"yearsKpiSub"}>
                    {total > 0 ? `${formatPct((billable / total) * 100)} billable` : "No time logged"}
                </span>
            </div>
            <div className={"yearsKpi"}>
                <span className={"yearsKpiLabel"}>Average per full year</span>
                <span className={"yearsKpiValue"}>{avgCompleted != null ? fmt(avgCompleted) : "—"}</span>
                <span className={"yearsKpiSub"}>
                    {completed.length} completed year{completed.length === 1 ? "" : "s"} with time
                </span>
            </div>
            <div className={"yearsKpi"}>
                <span className={"yearsKpiLabel"}>Best year</span>
                <span className={"yearsKpiValue"}>{best ? `FY${best.label}` : "—"}</span>
                <span className={"yearsKpiSub"}>{best ? `${fmt(best.hours.all)} hours` : "No completed years yet"}</span>
            </div>
            {current && (
                <div className={"yearsKpi"}>
                    <span className={"yearsKpiLabel"}>FY{current.label} to date</span>
                    <span className={"yearsKpiValue"}>{fmt(current.hours.all)}</span>
                    <span className={"yearsKpiSub"}>On pace for {fmt(yearPace(current))}</span>
                </div>
            )}
        </div>
    );
}

function YearsChart({summaries, billableTargetHours, fmt}: {
    summaries: IYearSummary[];
    billableTargetHours: number;
    fmt: Fmt;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const maxHours = Math.max(billableTargetHours, ...summaries.map(y => y.hours.all), 1);
    const pctOf = (h: number) => `${(h / maxHours) * 100}%`;

    return (
        <div className={"yearsChart"}>
            <div className={"yearsChartLegend"}>
                <span><i className={"yearsSwatch yearsSwatchBillable"}/>Billable</span>
                <span><i className={"yearsSwatch yearsSwatchNonBillable"}/>Non-billable</span>
                <span><i className={"yearsSwatchLine"}/>Billable target ({fmt(billableTargetHours)})</span>
            </div>
            <div className={"yearsChartPlot"} role={"img"} aria-label={"Hours per fiscal year, billable and non-billable"}>
                <div className={"yearsChartTarget"} style={{bottom: pctOf(billableTargetHours)}}/>
                {summaries.map(y => (
                    <div
                        key={y.label}
                        className={`yearsChartColumn ${hovered === y.label ? "hovered" : ""}`}
                        onMouseEnter={() => setHovered(y.label)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <div className={"yearsChartStack"} style={{height: pctOf(y.hours.all)}}>
                            <span className={"yearsChartValue"}>{y.hours.all > 0 ? fmt(y.hours.all) : ""}</span>
                            {y.hours.nonBillable > 0 && (
                                <div className={"yearsChartNonBillable"} style={{flexGrow: y.hours.nonBillable}}/>
                            )}
                            {y.hours.billable > 0 && (
                                <div className={"yearsChartBillable"} style={{flexGrow: y.hours.billable}}/>
                            )}
                        </div>
                        {hovered === y.label && (
                            <div className={"yearsChartTooltip"} role={"dialog"} aria-label={`FY${y.label} values`}>
                                <strong>FY{y.label}{y.isCurrent ? " (to date)" : ""}</strong>
                                <dl>
                                    <dt>Total</dt><dd>{fmt(y.hours.all)}</dd>
                                    <dt>Billable</dt><dd>{fmt(y.hours.billable)}</dd>
                                    <dt>Non-billable</dt><dd>{fmt(y.hours.nonBillable)}</dd>
                                    <dt>vs target</dt><dd>{billableTargetHours > 0 ? formatPct((y.hours.billable / billableTargetHours) * 100) : "—"}</dd>
                                    {y.isCurrent && <><dt>On pace for</dt><dd>{fmt(yearPace(y))}</dd></>}
                                </dl>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className={"yearsChartAxis"}>
                {summaries.map(y => (
                    <Link key={y.label} to={`/year?year=${y.label}`} className={"yearsChartAxisLabel"}>
                        FY{y.label}
                        {y.isCurrent && <span className={"yearsChartAxisSub"}>to date</span>}
                    </Link>
                ))}
            </div>
        </div>
    );
}

function YearsTable({summaries, billableTargetHours, fmt}: {
    summaries: IYearSummary[];
    billableTargetHours: number;
    fmt: Fmt;
}) {
    return (
        <div className={"yearsTableWrap"}>
            <table className={"yearsTable"}>
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Total</th>
                        <th>Billable</th>
                        <th>Non-billable</th>
                        <th title={"Billable share of total hours"}>Billable %</th>
                        <th title={"Billable hours vs the current annual billable target"}>Of target</th>
                        <th title={"Days with any time logged"}>Days worked</th>
                        <th title={"Average hours per day worked"}>Avg / day</th>
                        <th title={"Average hours per calendar week elapsed"}>Avg / week</th>
                        <th>Projects</th>
                        <th>Clients</th>
                        <th title={"Change in total hours vs the prior year (current year uses its pace)"}>vs prior year</th>
                    </tr>
                </thead>
                <tbody>
                    {summaries.map((y, i) => {
                        const prev = summaries[i - 1];
                        const compare = yearPace(y);
                        const change = prev && prev.hours.all > 0 ? ((compare - prev.hours.all) / prev.hours.all) * 100 : null;
                        const weeks = y.elapsedDays / 7;
                        return (
                            <tr key={y.label} className={y.isCurrent ? "yearsCurrentRow" : ""}>
                                <td>
                                    <Link to={`/year?year=${y.label}`}>FY{y.label}</Link>
                                    {y.isCurrent && <span className={"yearsToDate"}>to date</span>}
                                </td>
                                <td className={"num"}><strong>{fmt(y.hours.all)}</strong></td>
                                <td className={"num"}>{fmt(y.hours.billable)}</td>
                                <td className={"num"}>{fmt(y.hours.nonBillable)}</td>
                                <td className={"num"}>{y.hours.all > 0 ? formatPct((y.hours.billable / y.hours.all) * 100) : "—"}</td>
                                <td className={"num"}>{billableTargetHours > 0 ? formatPct((y.hours.billable / billableTargetHours) * 100) : "—"}</td>
                                <td className={"num"}>{y.daysWorked}</td>
                                <td className={"num"}>{y.daysWorked > 0 ? fmt(y.hours.all / y.daysWorked) : "—"}</td>
                                <td className={"num"}>{weeks > 0 ? fmt(y.hours.all / weeks) : "—"}</td>
                                <td className={"num"}>{y.projectCount}</td>
                                <td className={"num"}>{y.clientCount}</td>
                                <td className={"num"} title={y.isCurrent ? `Based on pace of ${fmt(compare)}` : undefined}>
                                    {change == null ? "—" : (
                                        <span className={change >= 0 ? "yearsChangeUp" : "yearsChangeDown"}>
                                            {change >= 0 ? "▲" : "▼"} {formatPct(Math.abs(change))}
                                            {y.isCurrent && "*"}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {summaries.some(y => y.isCurrent) && (
                <p className={"configHint yearsFootnote"}>* Current year compared using its projected pace for the full year.</p>
            )}
        </div>
    );
}

function YearsHeatmap({summaries, monthLabels, filter, todayKey, fmt}: {
    summaries: IYearSummary[];
    monthLabels: string[];
    filter: BillableFilter;
    todayKey: string;
    fmt: Fmt;
}) {
    const maxMonth = Math.max(1, ...summaries.flatMap(y => y.months.map(m => pickHours(m, filter))));
    const todayMonth = todayKey.slice(0, 7);

    return (
        <div className={"yearsTableWrap"}>
            <table className={"yearsTable yearsHeatmap"} data-billable-mode={filter}>
                <thead>
                    <tr>
                        <th>Year</th>
                        {monthLabels.map(m => <th key={m} className={"num"}>{m}</th>)}
                        <th className={"num"}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {summaries.map(y => {
                        const fyStart = dayjs(y.startKey);
                        return (
                            <tr key={y.label}>
                                <td><Link to={`/year?year=${y.label}`}>FY{y.label}</Link></td>
                                {y.months.map((m, i) => {
                                    const monthStart = fyStart.add(i, "month");
                                    const isFuture = monthStart.format("YYYY-MM") > todayMonth;
                                    const hours = pickHours(m, filter);
                                    return (
                                        <td
                                            key={i}
                                            className={`num yearsHeatCell ${isFuture ? "future" : ""}`}
                                            style={hours > 0 ? {["--heat" as string]: hours / maxMonth} as React.CSSProperties : undefined}
                                            title={`${monthStart.format("MMMM YYYY")}: ${fmt(hours)} h`}
                                        >
                                            {isFuture ? "" : hours > 0 ? Math.round(hours) : "·"}
                                        </td>
                                    );
                                })}
                                <td className={"num"}><strong>{fmt(pickHours(y.hours, filter))}</strong></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function YearsClients({summaries, filter, fmt}: {summaries: IYearSummary[]; filter: BillableFilter; fmt: Fmt}) {
    const {rows, otherRow} = useMemo(() => {
        const totals = new Map<string, number>();
        summaries.forEach(y => Object.entries(y.clients).forEach(([name, split]) => {
            totals.set(name, (totals.get(name) ?? 0) + pickHours(split, filter));
        }));
        const ranked = Array.from(totals.entries()).filter(([, h]) => h > 0).sort((a, b) => b[1] - a[1]);
        const top = ranked.slice(0, TOP_CLIENT_COUNT).map(([name, total]) => ({
            name,
            total,
            byYear: summaries.map(y => (y.clients[name] ? pickHours(y.clients[name], filter) : 0))
        }));
        const rest = ranked.slice(TOP_CLIENT_COUNT).map(([name]) => name);
        const other = rest.length
            ? {
                name: `Other (${rest.length})`,
                total: ranked.slice(TOP_CLIENT_COUNT).reduce((s, [, h]) => s + h, 0),
                byYear: summaries.map(y => rest.reduce((s, n) => s + (y.clients[n] ? pickHours(y.clients[n], filter) : 0), 0))
            }
            : null;
        return {rows: top, otherRow: other};
    }, [summaries, filter]);

    if (rows.length === 0) return <p className={"configHint"}>No time logged in these years.</p>;

    const renderRow = (r: {name: string; total: number; byYear: number[]}, className?: string) => (
        <tr key={r.name} className={className}>
            <td className={r.name === NO_CLIENT_LABEL ? "yearsMuted" : undefined}>{r.name}</td>
            {r.byYear.map((h, i) => <td key={summaries[i].label} className={"num"}>{h > 0 ? fmt(h) : "—"}</td>)}
            <td className={"num"}><strong>{fmt(r.total)}</strong></td>
        </tr>
    );

    return (
        <div className={"yearsTableWrap"}>
            <table className={"yearsTable"}>
                <thead>
                    <tr>
                        <th>Client</th>
                        {summaries.map(y => <th key={y.label} className={"num"}>FY{y.label}</th>)}
                        <th className={"num"}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => renderRow(r))}
                    {otherRow && renderRow(otherRow, "yearsOtherRow")}
                </tbody>
            </table>
        </div>
    );
}
