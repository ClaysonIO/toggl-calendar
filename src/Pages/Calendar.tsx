import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {CalendarDateNav} from "../Components/CalendarDateNav";
import {useLocation, Link} from "react-router-dom";
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

export const CalendarPage = () => {
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [sorting, setSorting] = useState<SortingState>([{id: "projectName", desc: false}]);
    const [searchValue, setSearchValue] = useState("");
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
            const existingProjectIds = new Set(safeProjectPreferences.map(pref => pref.projectId));
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
    }, [workspaceId, projects, safeProjectPreferences]);

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

    const projectSearchResults = useMemo(() => {
        const normalizedSearch = searchValue.trim().toLowerCase();
        if (!normalizedSearch) return [];

        return projects
            .filter(project => !weeklyPlanProjectIds.has(project.id))
            .filter(project => (
                project.name.toLowerCase().includes(normalizedSearch)
                || (project.client_name || "").toLowerCase().includes(normalizedSearch)
            ))
            .sort((a, b) => a.name.localeCompare(b.name, "en", {numeric: true}))
            .slice(0, 8);
    }, [searchValue, projects, weeklyPlanProjectIds]);

    const addProjectToSelectedWeek = useCallback(async (projectId: number) => {
        const projectedHours = weeklyPlanByProjectId[projectId]?.projectedWeekHours || 0;
        await upsertWeeklyPlan(projectId, projectedHours);
        setSearchValue("");
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
                        <span
                            className={"calendarProjectSwatch"}
                            style={{backgroundColor: row.original.projectColor}}
                        />
                        <span className={"calendarProjectName"}>{row.original.projectName}</span>
                        <span className={row.original.billable ? "billableBadge billable" : "billableBadge nonBillable"}>
                            {row.original.billable ? "Billable" : "Non-billable"}
                        </span>
                    </button>
                )
            },
            {
                id: "clientName",
                accessorFn: row => row.clientName,
                header: ({column}) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Client <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => <span className={"calendarClientName"}>{row.original.clientName || "-"}</span>
            },
            {
                id: "projectedHours",
                accessorFn: row => row.projectedHours,
                header: ({column}) => (
                    <button className={"calendarSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Projected <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <input
                        key={`${row.original.projectId}-${row.original.projectedHours}`}
                        className={"projectedHoursInput"}
                        type={"number"}
                        min={0}
                        step={0.25}
                        defaultValue={row.original.projectedHours}
                        onBlur={(event) => {
                            const parsedValue = Number(event.currentTarget.value);
                            const safeValue = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
                            void upsertWeeklyPlan(row.original.projectId, safeValue);
                            if (!Number.isFinite(parsedValue) || parsedValue < 0) {
                                event.currentTarget.value = safeValue.toString();
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.currentTarget.blur();
                            }
                        }}
                    />
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
                        Total Hours <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <strong className={"calendarTotalHours"}>
                        {formatHoursForDisplay(row.original.totalHours)}
                    </strong>
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

    if (!workspace) {
        return (
            <Layout>
                <h2>Calendar</h2>
                <p>
                    Select a workspace in <Link to={"/settings"}>Settings</Link> to view your calendar.
                </p>
            </Layout>
        );
    }

    const showLoading = projectsLoading || detailsLoading;
    const leafColumnCount = table.getAllLeafColumns().length;

    return (
        <Layout>
            <h2>Calendar</h2>
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

            <div className={"calendarSearch"}>
                <input
                    type={"text"}
                    value={searchValue}
                    placeholder={"Search project name and press Enter to add to this week"}
                    onChange={event => setSearchValue(event.currentTarget.value)}
                    onKeyDown={event => {
                        if (event.key === "Enter" && projectSearchResults.length) {
                            void addProjectToSelectedWeek(projectSearchResults[0].id);
                        }
                    }}
                />
                <button
                    className={"calendarHeaderButton"}
                    onClick={() => {
                        if (projectSearchResults.length) {
                            void addProjectToSelectedWeek(projectSearchResults[0].id);
                        }
                    }}
                    disabled={!projectSearchResults.length}
                >
                    Add
                </button>
            </div>

            {searchValue.trim().length > 0 && (
                <div className={"calendarSearchResults"}>
                    {projectSearchResults.length ? projectSearchResults.map(project => (
                        <button
                            key={project.id}
                            className={"calendarSearchResult"}
                            onClick={() => void addProjectToSelectedWeek(project.id)}
                        >
                            <span>{project.name}</span>
                            <small>{project.client_name || "No client"}</small>
                        </button>
                    )) : <div className={"calendarSearchResultEmpty"}>No projects found for this week.</div>}
                </div>
            )}

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
                        <th>Billable Sum</th>
                        <th/>
                        <th>{formatHoursForDisplay(billableSummary.projectedHours)}</th>
                        {dateKeys.map(date => (
                            <th key={`billable-${date}`}>{formatHoursForDisplay(billableSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(billableSummary.totalHours)}</th>
                    </tr>
                    <tr>
                        <th>Non-billable Sum</th>
                        <th/>
                        <th>{formatHoursForDisplay(nonBillableSummary.projectedHours)}</th>
                        {dateKeys.map(date => (
                            <th key={`non-billable-${date}`}>{formatHoursForDisplay(nonBillableSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(nonBillableSummary.totalHours)}</th>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </Layout>
    );
};