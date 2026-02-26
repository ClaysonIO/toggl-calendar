import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {CalendarDateNav} from "../Components/CalendarDateNav";
import {useLocation} from "react-router-dom";
import {ConfigDialog} from "../Components/ConfigDialog";
import dayjs from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {useTogglProjects} from "../Utilities/useTogglProjects";
import {useTogglDetails} from "../Utilities/useTogglDetails";
import {Loading} from "../Components/Loading";
import {useLiveQuery} from "dexie-react-hooks";
import {
    BILLABLE_TARGET_SETTING_KEY,
    calendarDb,
    DEFAULT_BILLABLE_TARGET_HOURS,
    getProjectPreferenceKey,
    getWeeklyPlanKey,
    IProjectPreference,
    IWeeklyProjectPlan
} from "../Utilities/calendarDb";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable
} from "@tanstack/react-table";
import {ISingleProject} from "../Utilities/Interfaces/ISingleProject";
import {DecimalToRoundedTime} from "../Utilities/Functions/DecimalToRoundedTime";
import "./Calendar.css";

interface ICalendarTableRow {
    id: string;
    projectId: number;
    projectName: string;
    clientName: string;
    projectColor: string;
    billable: boolean;
    projectedHours: number;
    totalHours: number;
    dailyHours: {[date: string]: number};
    dailyTaskDescriptions: {[date: string]: string[]};
    hasWeeklyPlan: boolean;
}

interface IHoursSummary {
    projectedHours: number;
    totalHours: number;
    dailyHours: {[date: string]: number};
}

const roundHours = (hours: number) => Math.round(hours * 100) / 100;

type TimeDisplayMode = "rounded" | "actual";
type RowDisplayMode = "time" | "description" | "timeAndDescription";

const TIME_DISPLAY_STORAGE_KEY = "calendarTimeDisplayMode";
const ROW_DISPLAY_STORAGE_KEY = "calendarRowDisplayMode";

const safeWindow = typeof window !== "undefined" ? window : undefined;

const loadTimeDisplayMode = (): TimeDisplayMode => {
    const storedValue = safeWindow?.localStorage.getItem(TIME_DISPLAY_STORAGE_KEY);
    return storedValue === "actual" ? "actual" : "rounded";
};

const loadRowDisplayMode = (): RowDisplayMode => {
    const storedValue = safeWindow?.localStorage.getItem(ROW_DISPLAY_STORAGE_KEY);
    switch (storedValue) {
        case "description":
        case "timeAndDescription":
        case "time":
            return storedValue;
        default:
            return "time";
    }
};

const formatClockHours = (hours: number) => {
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${wholeHours}:${minutes.toString().padStart(2, "0")}`;
};

const formatHours = (hours: number, displayMode: TimeDisplayMode) => (
    displayMode === "actual"
        ? formatClockHours(hours)
        : DecimalToRoundedTime(hours)
);

const createEmptyDailyHours = (dateKeys: string[]) =>
    dateKeys.reduce((acc: {[date: string]: number}, date) => {
        acc[date] = 0;
        return acc;
    }, {});

const createEmptyDailyTaskDescriptions = (dateKeys: string[]) =>
    dateKeys.reduce((acc: {[date: string]: string[]}, date) => {
        acc[date] = [];
        return acc;
    }, {});

const summarizeRows = (rows: ICalendarTableRow[], dateKeys: string[]): IHoursSummary => {
    const summary: IHoursSummary = {
        projectedHours: 0,
        totalHours: 0,
        dailyHours: createEmptyDailyHours(dateKeys)
    };

    rows.forEach(row => {
        summary.projectedHours += row.projectedHours;
        summary.totalHours += row.totalHours;
        dateKeys.forEach(date => {
            summary.dailyHours[date] += row.dailyHours[date] || 0;
        });
    });

    return summary;
};

const sortSymbol = (sortState: false | "asc" | "desc") => {
    if (sortState === "asc") return "▲";
    if (sortState === "desc") return "▼";
    return "↕";
};

const getProgressBarColor = (actual: number, projected: number, hasWeeklyPlan: boolean): string => {
    if (!hasWeeklyPlan || projected <= 0) return "#2f81f7";

    const ratio = actual / projected;

    if (ratio > 1.2) return "#9b59b6";

    const pct = Math.min(ratio, 1);
    if (pct <= 0.5) {
        const r = Math.round(220 + (255 - 220) * (pct / 0.5));
        const g = Math.round(50 + (193 - 50) * (pct / 0.5));
        const b = Math.round(50 + (7 - 50) * (pct / 0.5));
        return `rgb(${r},${g},${b})`;
    }
    const t = (pct - 0.5) / 0.5;
    const r = Math.round(255 + (40 - 255) * t);
    const g = Math.round(193 + (167 - 193) * t);
    const b = Math.round(7 + (70 - 7) * t);
    return `rgb(${r},${g},${b})`;
};

const TotalHoursCell = React.memo(({row, formatHours, onProjectedChange}: {
    row: ICalendarTableRow,
    formatHours: (h: number) => string,
    onProjectedChange: (projectId: number, value: number) => void
}) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const projected = row.projectedHours;
    const actual = row.totalHours;
    const progressPct = projected > 0 ? Math.min((actual / projected) * 100, 100) : (actual > 0 ? 100 : 0);
    const barColor = getProgressBarColor(actual, projected, row.hasWeeklyPlan);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commitEdit = (value: string) => {
        setEditing(false);
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        onProjectedChange(row.projectId, safe);
    };

    return (
        <div className={"totalHoursCell"}>
            <span className={"totalHoursText"}>
                <strong>{formatHours(actual)}</strong>
                <span className={"totalHoursSeparator"}>/</span>
                {editing ? (
                    <input
                        ref={inputRef}
                        className={"projectedInlineInput"}
                        type={"number"}
                        min={0}
                        step={0.25}
                        defaultValue={projected}
                        onBlur={e => commitEdit(e.currentTarget.value)}
                        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    />
                ) : (
                    <button
                        className={"projectedInlineButton"}
                        type={"button"}
                        onClick={() => setEditing(true)}
                        title={"Click to edit projected hours"}
                    >
                        {projected > 0 ? formatHours(projected) : "--"}
                    </button>
                )}
            </span>
            <div className={"progressBarTrack"}>
                <div
                    className={"progressBarFill"}
                    style={{width: `${progressPct}%`, background: barColor}}
                />
            </div>
        </div>
    );
});

const ProjectSearchBar = React.memo(({projects, weeklyPlanProjectIds, onAddProject}: {
    projects: ISingleProject[],
    weeklyPlanProjectIds: Set<number>,
    onAddProject: (projectId: number) => void
}) => {
    const [results, setResults] = useState<ISingleProject[]>([]);
    const [showResults, setShowResults] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const projectsRef = useRef(projects);
    const planIdsRef = useRef(weeklyPlanProjectIds);
    projectsRef.current = projects;
    planIdsRef.current = weeklyPlanProjectIds;

    const doSearch = useCallback((query: string) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            setResults([]);
            setShowResults(false);
            return;
        }
        const filtered = projectsRef.current
            .filter(p => !planIdsRef.current.has(p.id))
            .filter(p => p.name.toLowerCase().includes(normalized) || (p.client_name || "").toLowerCase().includes(normalized))
            .sort((a, b) => a.name.localeCompare(b.name, "en", {numeric: true}))
            .slice(0, 8);
        setResults(filtered);
        setShowResults(true);
    }, []);

    const handleInput = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            doSearch(inputRef.current?.value || "");
        }, 250);
    }, [doSearch]);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const handleAdd = useCallback((id: number) => {
        onAddProject(id);
        if (inputRef.current) inputRef.current.value = "";
        setResults([]);
        setShowResults(false);
    }, [onAddProject]);

    return (
        <>
            <div className={"calendarSearch"}>
                <input
                    ref={inputRef}
                    type={"text"}
                    defaultValue={""}
                    placeholder={"Search project name and press Enter to add to this week"}
                    onInput={handleInput}
                    onKeyDown={e => {
                        if (e.key === "Enter" && results.length) handleAdd(results[0].id);
                    }}
                />
                <button
                    className={"calendarHeaderButton"}
                    onClick={() => { if (results.length) handleAdd(results[0].id); }}
                    disabled={!results.length}
                >
                    Add
                </button>
            </div>
            {showResults && (
                <div className={"calendarSearchResults"}>
                    {results.length ? results.map(project => (
                        <button
                            key={project.id}
                            className={"calendarSearchResult"}
                            style={{
                                borderColor: project.color || "#ddd",
                                backgroundColor: (project.color || "#7A7A7A") + "18"
                            }}
                            onClick={() => handleAdd(project.id)}
                        >
                            <span style={{color: project.color || "inherit", fontWeight: 600}}>{project.name}</span>
                            <small>{project.client_name || "No client"}</small>
                        </button>
                    )) : <div className={"calendarSearchResultEmpty"}>No projects found.</div>}
                </div>
            )}
        </>
    );
});

export const CalendarPage = () => {
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [sorting, setSorting] = useState<SortingState>([{id: "clientName", desc: false}]);
    const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>(() => loadTimeDisplayMode());
    const [rowDisplayMode, setRowDisplayMode] = useState<RowDisplayMode>(() => loadRowDisplayMode());

    const fallbackStart = dayjs().startOf("week");
    const normalizedStartDate = startDate && dayjs(startDate).isValid()
        ? dayjs(startDate).startOf("day")
        : fallbackStart;
    const normalizedEndDate = endDate && dayjs(endDate).isValid()
        ? dayjs(endDate).startOf("day")
        : normalizedStartDate.endOf("week").startOf("day");

    const weekStart = normalizedStartDate.isBefore(normalizedEndDate, "day")
        ? normalizedStartDate
        : normalizedEndDate;
    const weekEnd = normalizedStartDate.isBefore(normalizedEndDate, "day")
        ? normalizedEndDate
        : normalizedStartDate;

    const weekStartKey = weekStart.format("YYYY-MM-DD");
    const weekEndKey = weekEnd.format("YYYY-MM-DD");

    const dateKeys = useMemo(() => {
        const result: string[] = [];
        let currentDate = weekStart;
        while (currentDate.isBefore(weekEnd, "day") || currentDate.isSame(weekEnd, "day")) {
            result.push(currentDate.format("YYYY-MM-DD"));
            currentDate = currentDate.add(1, "day");
        }
        return result;
    }, [weekStartKey, weekEndKey]);

    const workspace = appState.selectedWorkSpace;
    const workspaceId = workspace?.id || 0;
    const workspaceIdAsString = workspaceId ? workspaceId.toString() : "";

    const {data: projects = [], isLoading: projectsLoading} = useTogglProjects({workspace_id: workspaceIdAsString});
    const {simpleData, isLoading: detailsLoading} = useTogglDetails(workspaceIdAsString, weekStartKey, weekEndKey);

    const projectPreferences = useLiveQuery(
        async () => {
            if (!workspaceId) return [];
            return calendarDb.projectPreferences.where("workspaceId").equals(workspaceId).toArray();
        },
        [workspaceId],
        []
    );

    const weeklyPlans = useLiveQuery(
        async () => {
            if (!workspaceId) return [];
            return calendarDb.weeklyProjectPlans
                .where("[workspaceId+weekStart]")
                .equals([workspaceId, weekStartKey])
                .toArray();
        },
        [workspaceId, weekStartKey],
        []
    );

    const billableHoursTarget = useLiveQuery(
        async () => {
            const storedSetting = await calendarDb.settings.get(BILLABLE_TARGET_SETTING_KEY);
            return storedSetting?.value ?? DEFAULT_BILLABLE_TARGET_HOURS;
        },
        [],
        DEFAULT_BILLABLE_TARGET_HOURS
    );

    const safeProjectPreferences = (projectPreferences || []) as IProjectPreference[];
    const safeWeeklyPlans = (weeklyPlans || []) as IWeeklyProjectPlan[];

    useEffect(() => {
        safeWindow?.localStorage.setItem(TIME_DISPLAY_STORAGE_KEY, timeDisplayMode);
    }, [timeDisplayMode]);

    useEffect(() => {
        safeWindow?.localStorage.setItem(ROW_DISPLAY_STORAGE_KEY, rowDisplayMode);
    }, [rowDisplayMode]);

    useEffect(() => {
        const ensureTargetSetting = async () => {
            const current = await calendarDb.settings.get(BILLABLE_TARGET_SETTING_KEY);
            if (!current) {
                await calendarDb.settings.put({
                    key: BILLABLE_TARGET_SETTING_KEY,
                    value: DEFAULT_BILLABLE_TARGET_HOURS,
                    updatedAt: Date.now()
                });
            }
        };
        void ensureTargetSetting();
    }, []);

    useEffect(() => {
        if (!workspaceId || !projects.length) return;
        const ensureProjectPreferences = async () => {
            const existing = await calendarDb.projectPreferences
                .where("workspaceId").equals(workspaceId).toArray();
            const existingProjectIds = new Set(existing.map(pref => pref.projectId));
            const missingProjectPreferences: IProjectPreference[] = projects
                .filter(project => !existingProjectIds.has(project.id))
                .map(project => ({
                    key: getProjectPreferenceKey(workspaceId, project.id),
                    workspaceId,
                    projectId: project.id,
                    billable: true,
                    updatedAt: Date.now()
                }));

            if (missingProjectPreferences.length) {
                await calendarDb.projectPreferences.bulkPut(missingProjectPreferences);
            }
        };
        void ensureProjectPreferences();
    }, [workspaceId, projects]);

    const projectById = useMemo(
        () => projects.reduce((acc: {[projectId: number]: ISingleProject}, project) => {
            acc[project.id] = project;
            return acc;
        }, {}),
        [projects]
    );

    const preferenceByProjectId = useMemo(
        () => safeProjectPreferences.reduce((acc: {[projectId: number]: IProjectPreference}, preference) => {
            acc[preference.projectId] = preference;
            return acc;
        }, {}),
        [safeProjectPreferences]
    );

    const weeklyPlanByProjectId = useMemo(
        () => safeWeeklyPlans.reduce((acc: {[projectId: number]: IWeeklyProjectPlan}, weeklyPlan) => {
            acc[weeklyPlan.projectId] = weeklyPlan;
            return acc;
        }, {}),
        [safeWeeklyPlans]
    );

    const usageByProjectId = useMemo(() => {
        return Object.keys(simpleData || {})
            .reduce((acc: {[projectId: number]: {
                totalHours: number,
                dailyHours: {[date: string]: number},
                dailyTaskDescriptions: {[date: string]: string[]},
                projectName: string,
                clientName: string,
                projectColor: string
            }}, projectIdAsString) => {
                const projectId = Number(projectIdAsString);
                if (!Number.isFinite(projectId)) return acc;

                const projectDetails = simpleData?.[projectId];
                const details = projectDetails?.dates || {};

                const dailyHours = createEmptyDailyHours(dateKeys);
                const dailyTaskDescriptions = createEmptyDailyTaskDescriptions(dateKeys);
                let totalHours = 0;

                dateKeys.forEach(date => {
                    const dayDetails = details[date];
                    const dayHours = dayDetails?.hours || 0;
                    dailyHours[date] = dayHours;
                    totalHours += dayHours;
                    dailyTaskDescriptions[date] = Array.from(dayDetails?.taskDescriptions || [])
                        .map(description => description.trim())
                        .filter(description => !!description);
                });

                acc[projectId] = {
                    totalHours,
                    dailyHours,
                    dailyTaskDescriptions,
                    projectName: projectDetails?.project_name || "",
                    clientName: projectDetails?.client_name || "",
                    projectColor: projectDetails?.project_hex_color || ""
                };
                return acc;
            }, {});
    }, [simpleData, dateKeys]);

    const upsertWeeklyPlan = useCallback(async (projectId: number, projectedWeekHours: number) => {
        if (!workspaceId) return;
        const key = getWeeklyPlanKey(workspaceId, weekStartKey, projectId);
        const existingWeeklyPlan = await calendarDb.weeklyProjectPlans.get(key);
        await calendarDb.weeklyProjectPlans.put({
            key,
            workspaceId,
            weekStart: weekStartKey,
            projectId,
            projectedWeekHours: roundHours(Math.max(projectedWeekHours, 0)),
            projectedDailyHours: existingWeeklyPlan?.projectedDailyHours,
            updatedAt: Date.now()
        });
    }, [workspaceId, weekStartKey]);

    const toggleProjectBillable = useCallback(async (projectId: number, currentValue: boolean) => {
        if (!workspaceId) return;
        const key = getProjectPreferenceKey(workspaceId, projectId);
        await calendarDb.projectPreferences.put({
            key,
            workspaceId,
            projectId,
            billable: !currentValue,
            updatedAt: Date.now()
        });
    }, [workspaceId]);

    const tableRows = useMemo<ICalendarTableRow[]>(() => {
        const visibleProjectIds = new Set<number>();

        safeWeeklyPlans.forEach(plan => {
            visibleProjectIds.add(plan.projectId);
        });

        Object.keys(usageByProjectId).forEach(projectIdAsString => {
            const projectId = Number(projectIdAsString);
            if ((usageByProjectId[projectId]?.totalHours || 0) > 0) {
                visibleProjectIds.add(projectId);
            }
        });

        return Array.from(visibleProjectIds).map(projectId => {
            const project = projectById[projectId];
            const usage = usageByProjectId[projectId];
            const weeklyPlan = weeklyPlanByProjectId[projectId];
            const preference = preferenceByProjectId[projectId];

            return {
                id: `${workspaceId}-${weekStartKey}-${projectId}`,
                projectId,
                projectName: project?.name || usage?.projectName || `Project ${projectId}`,
                clientName: project?.client_name || usage?.clientName || "",
                projectColor: project?.color || usage?.projectColor || "#7A7A7A",
                billable: preference?.billable ?? true,
                projectedHours: weeklyPlan?.projectedWeekHours || 0,
                totalHours: usage?.totalHours || 0,
                dailyHours: usage?.dailyHours || createEmptyDailyHours(dateKeys),
                dailyTaskDescriptions: usage?.dailyTaskDescriptions || createEmptyDailyTaskDescriptions(dateKeys),
                hasWeeklyPlan: !!weeklyPlan
            };
        }).sort((a, b) => a.projectName.localeCompare(b.projectName, "en", {numeric: true}));
    }, [safeWeeklyPlans, usageByProjectId, projectById, weeklyPlanByProjectId, preferenceByProjectId, workspaceId, weekStartKey, dateKeys]);

    const weeklyPlanProjectIds = useMemo(() => new Set(safeWeeklyPlans.map(plan => plan.projectId)), [safeWeeklyPlans]);

    const addProjectToSelectedWeek = useCallback(async (projectId: number) => {
        const projectedHours = weeklyPlanByProjectId[projectId]?.projectedWeekHours || 0;
        await upsertWeeklyPlan(projectId, projectedHours);
    }, [upsertWeeklyPlan, weeklyPlanByProjectId]);

    const editBillableTarget = useCallback(async () => {
        const currentValue = billableHoursTarget ?? DEFAULT_BILLABLE_TARGET_HOURS;
        const promptResult = window.prompt("Billable hours target per week", currentValue.toString());
        if (promptResult === null) return;

        const parsedValue = Number(promptResult);
        if (!Number.isFinite(parsedValue) || parsedValue < 0) {
            alert("Please provide a non-negative number.");
            return;
        }

        await calendarDb.settings.put({
            key: BILLABLE_TARGET_SETTING_KEY,
            value: roundHours(parsedValue),
            updatedAt: Date.now()
        });
    }, [billableHoursTarget]);

    const safeBillableTarget = billableHoursTarget ?? DEFAULT_BILLABLE_TARGET_HOURS;
    const currentBillableHours = tableRows
        .filter(row => row.billable)
        .reduce((acc, row) => acc + row.totalHours, 0);
    const projectedHoursTotal = tableRows.reduce((acc, row) => acc + row.projectedHours, 0);

    const metricTotal = currentBillableHours + projectedHoursTotal + safeBillableTarget;
    const billableBarWidth = metricTotal > 0 ? (currentBillableHours / metricTotal) * 100 : 100 / 3;
    const projectedBarWidth = metricTotal > 0 ? (projectedHoursTotal / metricTotal) * 100 : 100 / 3;
    const targetBarWidth = metricTotal > 0 ? (safeBillableTarget / metricTotal) * 100 : 100 / 3;

    const billableSummary = useMemo(
        () => summarizeRows(tableRows.filter(row => row.billable), dateKeys),
        [tableRows, dateKeys]
    );

    const nonBillableSummary = useMemo(
        () => summarizeRows(tableRows.filter(row => !row.billable), dateKeys),
        [tableRows, dateKeys]
    );

    const totalSummary = useMemo(
        () => summarizeRows(tableRows, dateKeys),
        [tableRows, dateKeys]
    );

    const formatHoursForDisplay = useCallback((hours: number) => {
        return formatHours(hours, timeDisplayMode);
    }, [timeDisplayMode]);

    const renderDailyCellContent = useCallback((row: ICalendarTableRow, date: string) => {
        const dayHours = row.dailyHours[date] || 0;
        const descriptionText = (row.dailyTaskDescriptions[date] || []).join(", ");
        const hasDescription = !!descriptionText;
        const timeText = dayHours > 0 ? formatHoursForDisplay(dayHours) : "";

        switch (rowDisplayMode) {
            case "description":
                return hasDescription ? <span className={"calendarDayDescription"}>{descriptionText}</span> : "";
            case "timeAndDescription":
                if (!hasDescription && !timeText) return "";
                return (
                    <div className={"calendarDayCellCombined"}>
                        {timeText ? <strong>{timeText}</strong> : null}
                        {hasDescription ? <span className={"calendarDayDescription"}>{descriptionText}</span> : null}
                    </div>
                );
            default:
                return timeText ? <span>{timeText}</span> : "";
        }
    }, [formatHoursForDisplay, rowDisplayMode]);

    const columns = useMemo<ColumnDef<ICalendarTableRow>[]>(() => {
        return [
            {
                id: "clientName",
                accessorFn: row => row.clientName,
                header: ({column}) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Client <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => <span className={"calendarClientName"} style={{color: row.original.projectColor}}>{row.original.clientName || "-"}</span>
            },
            {
                id: "projectName",
                accessorFn: row => row.projectName,
                header: ({column}) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Project <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <button
                        className={"calendarProjectButton"}
                        type={"button"}
                        onClick={() => void toggleProjectBillable(row.original.projectId, row.original.billable)}
                    >
                        <span className={"calendarProjectName"} style={{color: row.original.projectColor}}>{row.original.projectName}</span>
                        <span className={row.original.billable ? "billableBadge billable" : "billableBadge nonBillable"}>
                            {row.original.billable ? "B" : "NB"}
                        </span>
                    </button>
                )
            },
            ...dateKeys.map(date => ({
                id: date,
                accessorFn: (row: ICalendarTableRow) => row.dailyHours[date] || 0,
                header: ({column}: any) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        {dayjs(date).format("ddd D")} <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}: any) => renderDailyCellContent(row.original, date)
            })),
            {
                id: "totalHours",
                accessorFn: row => row.totalHours,
                header: ({column}) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Hours <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <TotalHoursCell
                        row={row.original}
                        formatHours={formatHoursForDisplay}
                        onProjectedChange={(projectId, value) => void upsertWeeklyPlan(projectId, value)}
                    />
                )
            }
        ];
    }, [dateKeys, formatHoursForDisplay, renderDailyCellContent, toggleProjectBillable, upsertWeeklyPlan]);

    const table = useReactTable({
        data: tableRows,
        columns,
        state: {sorting},
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: row => row.id
    });

    const [showConfigPrompt, setShowConfigPrompt] = useState(false);

    if (!workspace) {
        return (
            <Layout>
                <h2>Calendar</h2>
                <p>
                    No workspace selected.{" "}
                    <button
                        className={"calendarHeaderButton"}
                        onClick={() => setShowConfigPrompt(true)}
                        type={"button"}
                    >
                        Open Config
                    </button>
                    {" "}to set your API key and choose a workspace.
                </p>
                <ConfigDialog open={showConfigPrompt} onClose={() => setShowConfigPrompt(false)}/>
            </Layout>
        );
    }

    const showLoading = projectsLoading || detailsLoading;
    const leafColumnCount = table.getAllLeafColumns().length;

    return (
        <Layout>
            <h2 style={{margin: "4px 0 6px"}}>Calendar</h2>
            <div className={"calendarHeader"}>
                <div>
                    <strong>{weekStart.format("MMM D, YYYY")} - {weekEnd.format("MMM D, YYYY")}</strong>
                </div>
                <div className={"calendarHeaderControls"}>
                    <CalendarDateNav/>
                    <div className={"calendarDisplayControls"}>
                        <div className={"calendarDisplayButtonGroup"}>
                            <button
                                className={`calendarHeaderButton ${timeDisplayMode === "rounded" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setTimeDisplayMode("rounded")}
                            >
                                Rounded
                            </button>
                            <button
                                className={`calendarHeaderButton ${timeDisplayMode === "actual" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setTimeDisplayMode("actual")}
                            >
                                Actual
                            </button>
                        </div>
                        <div className={"calendarDisplayButtonGroup"}>
                            <button
                                className={`calendarHeaderButton ${rowDisplayMode === "time" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("time")}
                            >
                                Time
                            </button>
                            <button
                                className={`calendarHeaderButton ${rowDisplayMode === "description" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("description")}
                            >
                                Descriptions
                            </button>
                            <button
                                className={`calendarHeaderButton ${rowDisplayMode === "timeAndDescription" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("timeAndDescription")}
                            >
                                Time + Descriptions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ProjectSearchBar
                projects={projects}
                weeklyPlanProjectIds={weeklyPlanProjectIds}
                onAddProject={addProjectToSelectedWeek}
            />

            <div className={"metricsContainer"}>
                <div className={"metricsBar"}>
                    <div className={"metricSegment currentBillable"} style={{width: `${billableBarWidth}%`}}/>
                    <div className={"metricSegment projected"} style={{width: `${projectedBarWidth}%`}}/>
                    <div className={"metricSegment target"} style={{width: `${targetBarWidth}%`}}/>
                </div>
                <button className={"calendarHeaderButton"} onClick={() => void editBillableTarget()}>
                    Edit Target
                </button>
            </div>
            <div className={"metricLegend"}>
                <span><strong>Current Billable:</strong> {formatHoursForDisplay(currentBillableHours)}</span>
                <span><strong>Projected:</strong> {formatHoursForDisplay(projectedHoursTotal)}</span>
                <span><strong>Target:</strong> {formatHoursForDisplay(safeBillableTarget)}</span>
            </div>

            <div className={"calendarTableContainer"}>
                <table className={"calendarTable"}>
                    <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                    </thead>
                    <tbody>
                    {showLoading && !tableRows.length ? (
                        <tr>
                            <td colSpan={leafColumnCount}>
                                <div className={"calendarLoading"}>
                                    <Loading/>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={leafColumnCount}>
                                    <div className={"calendarNoRows"}>
                                        No projects yet. Track time or add a project to this week.
                                    </div>
                                </td>
                            </tr>
                        )
                    )}
                    </tbody>
                    <tfoot>
                    <tr>
                        <th>Billable</th>
                        <th/>
                        {dateKeys.map(date => (
                            <th key={`billable-${date}`}>{formatHoursForDisplay(billableSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(billableSummary.totalHours)}{billableSummary.projectedHours > 0 ? ` / ${formatHoursForDisplay(billableSummary.projectedHours)}` : ""}</th>
                    </tr>
                    <tr>
                        <th>Non-billable</th>
                        <th/>
                        {dateKeys.map(date => (
                            <th key={`non-billable-${date}`}>{formatHoursForDisplay(nonBillableSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(nonBillableSummary.totalHours)}{nonBillableSummary.projectedHours > 0 ? ` / ${formatHoursForDisplay(nonBillableSummary.projectedHours)}` : ""}</th>
                    </tr>
                    <tr className={"summaryTotal"}>
                        <th>Total</th>
                        <th/>
                        {dateKeys.map(date => (
                            <th key={`total-${date}`}>{formatHoursForDisplay(totalSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(totalSummary.totalHours)}{totalSummary.projectedHours > 0 ? ` / ${formatHoursForDisplay(totalSummary.projectedHours)}` : ""}</th>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </Layout>
    );
};