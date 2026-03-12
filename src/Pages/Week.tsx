import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Layout} from "../Components/Layout";
import {useAppContext} from "../Utilities/AppContext";
import {CalendarDateNav} from "../Components/CalendarDateNav";
import {useLocation} from "react-router-dom";
import {ConfigDialog} from "../Components/ConfigDialog";
import dayjs from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {getSimpleDataFromDexie} from "../Utilities/togglDetailsFromDexie";
import {useTogglSync} from "../Utilities/useTogglSync";
import {Loading} from "../Components/Loading";
import {useLiveQuery} from "dexie-react-hooks";
import {
    BILLABLE_TARGET_SETTING_KEY,
    calendarDb,
    DEFAULT_BILLABLE_TARGET_HOURS,
    getProjectPreferenceKey,
    getWeeklyPlanKey,
    getWeeklyTargetKey,
    getManualTimeEntryKey,
    getProjectNoteKey,
    MANUAL_WORKSPACE_ID,
    IProjectPreference,
    IWeeklyProjectPlan
} from "../Utilities/calendarDb";
import {InputDialog} from "../Components/InputDialog";
import {ProjectNotesDialog} from "../Components/ProjectNotesDialog";
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
import {getAllManualProjectsAsSingleProject, getManualSimpleData} from "../Utilities/manualData";
import "./Week.css";

interface IWeekTableRow {
    id: string;
    projectId: number;
    projectName: string;
    clientName: string;
    projectColor: string;
    billable: boolean;
    projectedHours: number;
    totalHours: number;
    dailyHours: {[date: string]: number};
    dailyProjectedHours: {[date: string]: number};
    dailyTaskDescriptions: {[date: string]: string[]};
    hasWeeklyPlan: boolean;
    hasNotes: boolean;
}

interface IHoursSummary {
    projectedHours: number;
    totalHours: number;
    dailyHours: {[date: string]: number};
}

const roundHours = (hours: number) => Math.round(hours * 100) / 100;

type TimeDisplayMode = "rounded" | "actual";
type RowDisplayMode = "time" | "description" | "timeAndDescription" | "projections";

const TIME_DISPLAY_STORAGE_KEY = "weekTimeDisplayMode";
const ROW_DISPLAY_STORAGE_KEY = "weekRowDisplayMode";

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
        case "projections":
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

const summarizeRows = (rows: IWeekTableRow[], dateKeys: string[]): IHoursSummary => {
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
    if (!hasWeeklyPlan || projected <= 0) return "var(--progress-track)";

    const ratio = actual / projected;

    if (ratio > 1.2) return "#2f81f7";

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
    row: IWeekTableRow,
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

const WeeklyTargetCell = React.memo(({totalHours, targetHours, formatHours, onTargetChange}: {
    totalHours: number,
    targetHours: number,
    formatHours: (h: number) => string,
    onTargetChange: (value: number) => void
}) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const progressPct = targetHours > 0 ? Math.min((totalHours / targetHours) * 100, 100) : 0;
    const barColor = getProgressBarColor(totalHours, targetHours, true);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commitEdit = (value: string) => {
        setEditing(false);
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : targetHours;
        onTargetChange(safe);
    };

    return (
        <div className={"totalHoursCell"}>
            <span className={"totalHoursText"}>
                <strong>{formatHours(totalHours)}</strong>
                <span className={"totalHoursSeparator"}>/</span>
                {editing ? (
                    <input
                        ref={inputRef}
                        className={"projectedInlineInput"}
                        type={"number"}
                        min={0}
                        step={0.25}
                        defaultValue={targetHours}
                        onBlur={e => commitEdit(e.currentTarget.value)}
                        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    />
                ) : (
                    <button
                        className={"projectedInlineButton"}
                        type={"button"}
                        onClick={() => setEditing(true)}
                        title={"Click to edit weekly target"}
                    >
                        {formatHours(targetHours)}
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

const ProjectionCell = React.memo(({projectId, date, projectedHours, onProjectionChange}: {
    projectId: number,
    date: string,
    projectedHours: number,
    onProjectionChange: (projectId: number, date: string, hours: number) => void
}) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
        onProjectionChange(projectId, date, safe);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                className={"projectedInlineInput"}
                type={"number"}
                min={0}
                step={0.25}
                defaultValue={projectedHours}
                onBlur={e => commitEdit(e.currentTarget.value)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setEditing(false); } }}
            />
        );
    }

    return (
        <button
            className={"projectedInlineButton projectionDayButton"}
            type={"button"}
            onClick={() => setEditing(true)}
            title={"Click to set projected hours for this day"}
        >
            {projectedHours > 0 ? String(projectedHours) : "--"}
        </button>
    );
});

const ManualTimeCell = React.memo(({projectId, date, hours, formatHoursFn, onTimeChange}: {
    projectId: number,
    date: string,
    hours: number,
    formatHoursFn: (h: number) => string,
    onTimeChange: (projectId: number, date: string, hours: number) => void
}) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
        onTimeChange(projectId, date, safe);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                className={"projectedInlineInput"}
                type={"number"}
                min={0}
                step={0.25}
                defaultValue={hours}
                onBlur={e => commitEdit(e.currentTarget.value)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setEditing(false); } }}
            />
        );
    }

    return (
        <button
            className={"projectedInlineButton projectionDayButton"}
            type={"button"}
            onClick={() => setEditing(true)}
            title={"Click to enter hours"}
        >
            {hours > 0 ? formatHoursFn(hours) : "--"}
        </button>
    );
});

const NotesButton = React.memo(({hasNotes, onClick}: {
    hasNotes: boolean;
    onClick: () => void;
}) => (
    <button
        className={`notesIconButton ${hasNotes ? "hasNotes" : ""}`}
        type="button"
        onClick={onClick}
        title={hasNotes ? "View/edit notes" : "Add notes"}
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    </button>
));

const SYNC_ERROR_TOOLTIP = "Unable to fetch this week's data. Try again in an hour.";

const SyncWeekButton = React.memo(({
    isSyncing,
    syncError,
    onSync,
    onClearError
}: {
    isSyncing: boolean;
    syncError: boolean;
    onSync: () => void;
    onClearError: () => void;
}) => (
    <button
        type="button"
        className={`weekHeaderButton ${syncError ? "syncError" : ""}`}
        onClick={() => { onClearError(); onSync(); }}
        disabled={isSyncing}
        title={syncError ? SYNC_ERROR_TOOLTIP : "Fetch this week's data from Toggl"}
    >
        {isSyncing ? "Syncing…" : syncError ? "Sync failed" : "Sync week"}
    </button>
));

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
            <div className={"weekSearch"}>
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
                    className={"weekHeaderButton"}
                    onClick={() => { if (results.length) handleAdd(results[0].id); }}
                    disabled={!results.length}
                >
                    Add
                </button>
            </div>
            {showResults && (
                <div className={"weekSearchResults"}>
                    {results.length ? results.map(project => (
                        <button
                            key={project.id}
                            className={"weekSearchResult"}
                            style={{
                                borderColor: project.color || "#ddd",
                                backgroundColor: (project.color || "#7A7A7A") + "18"
                            }}
                            onClick={() => handleAdd(project.id)}
                        >
                            <span style={{color: project.color || "inherit", fontWeight: 600}}>{project.name}</span>
                            <small>{project.client_name || "No client"}</small>
                        </button>
                    )) : <div className={"weekSearchResultEmpty"}>No projects found.</div>}
                </div>
            )}
        </>
    );
});

export const WeekPage = () => {
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [sorting, setSorting] = useState<SortingState>([{id: "clientName", desc: false}]);
    const [varianceSorting, setVarianceSorting] = useState<SortingState>([{id: "clientName", desc: false}]);
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

    const {selectedWorkspace, dataMode} = useAppContext();
    const isManual = dataMode === "manual";
    const workspaceId = isManual ? MANUAL_WORKSPACE_ID : (selectedWorkspace?.id || 0);

    const projectsFromDexie = useLiveQuery(
        async () => {
            if (isManual) return getAllManualProjectsAsSingleProject();
            if (!workspaceId) return [];
            return calendarDb.togglProjects.where("workspace_id").equals(workspaceId).toArray();
        },
        [workspaceId, isManual],
        []
    );
    const projects = projectsFromDexie ?? [];
    const projectsLoading = !isManual && workspaceId !== 0 && projectsFromDexie === undefined;

    const simpleDataFromDexie = useLiveQuery(
        () => {
            if (isManual) return getManualSimpleData(weekStartKey, weekEndKey);
            return getSimpleDataFromDexie(workspaceId, weekStartKey, weekEndKey);
        },
        [workspaceId, weekStartKey, weekEndKey, isManual]
    );
    const simpleData = simpleDataFromDexie;
    const detailsLoading = !isManual && workspaceId !== 0 && simpleDataFromDexie === undefined;

    const {syncWeekRange, isSyncing, syncError, setSyncError} = useTogglSync(
        isManual ? 0 : workspaceId,
        weekStartKey,
        weekEndKey
    );
    useEffect(() => {
        setSyncError(false);
    }, [weekStartKey, weekEndKey, setSyncError]);

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

    const projectNotes = useLiveQuery(
        async () => {
            if (!workspaceId) return [];
            return calendarDb.projectNotes.where("workspaceId").equals(workspaceId).toArray();
        },
        [workspaceId],
        []
    );

    const projectNotesByProjectId = useMemo(
        () => (projectNotes || []).reduce((acc: {[projectId: number]: string}, note) => {
            if (note.notes && note.notes.trim()) acc[note.projectId] = note.notes;
            return acc;
        }, {}),
        [projectNotes]
    );

    const weeklyBillableTarget = useLiveQuery(
        async () => {
            const weekSetting = await calendarDb.settings.get(getWeeklyTargetKey(weekStartKey));
            if (weekSetting) return weekSetting.value;
            const globalSetting = await calendarDb.settings.get(BILLABLE_TARGET_SETTING_KEY);
            return globalSetting?.value ?? DEFAULT_BILLABLE_TARGET_HOURS;
        },
        [weekStartKey],
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

    const upsertDailyProjection = useCallback(async (projectId: number, date: string, hours: number) => {
        if (!workspaceId) return;
        const key = getWeeklyPlanKey(workspaceId, weekStartKey, projectId);
        const existing = await calendarDb.weeklyProjectPlans.get(key);
        const updatedDailyHours = {...(existing?.projectedDailyHours || {})};
        updatedDailyHours[date] = roundHours(Math.max(hours, 0));
        await calendarDb.weeklyProjectPlans.put({
            key,
            workspaceId,
            weekStart: weekStartKey,
            projectId,
            projectedWeekHours: existing?.projectedWeekHours || 0,
            projectedDailyHours: updatedDailyHours,
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

    const upsertManualTime = useCallback(async (projectId: number, date: string, hours: number) => {
        const key = getManualTimeEntryKey(projectId, date);
        if (hours <= 0) {
            await calendarDb.manualTimeEntries.delete(key);
        } else {
            await calendarDb.manualTimeEntries.put({
                key,
                projectId,
                date,
                hours: Math.round(hours * 100) / 100,
                description: "",
                updatedAt: Date.now()
            });
        }
    }, []);

    const tableRows = useMemo<IWeekTableRow[]>(() => {
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

            const dailyProjectedHours = dateKeys.reduce((acc: {[date: string]: number}, date) => {
                acc[date] = weeklyPlan?.projectedDailyHours?.[date] || 0;
                return acc;
            }, {});

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
                dailyProjectedHours,
                dailyTaskDescriptions: usage?.dailyTaskDescriptions || createEmptyDailyTaskDescriptions(dateKeys),
                hasWeeklyPlan: !!weeklyPlan,
                hasNotes: !!projectNotesByProjectId[projectId]
            };
        }).sort((a, b) => a.projectName.localeCompare(b.projectName, "en", {numeric: true}));
    }, [safeWeeklyPlans, usageByProjectId, projectById, weeklyPlanByProjectId, preferenceByProjectId, workspaceId, weekStartKey, dateKeys, projectNotesByProjectId]);

    const weeklyPlanProjectIds = useMemo(() => new Set(safeWeeklyPlans.map(plan => plan.projectId)), [safeWeeklyPlans]);

    const addProjectToSelectedWeek = useCallback(async (projectId: number) => {
        const projectedHours = weeklyPlanByProjectId[projectId]?.projectedWeekHours || 0;
        await upsertWeeklyPlan(projectId, projectedHours);
    }, [upsertWeeklyPlan, weeklyPlanByProjectId]);

    const updateWeeklyTarget = useCallback(async (value: number) => {
        await calendarDb.settings.put({
            key: getWeeklyTargetKey(weekStartKey),
            value: roundHours(Math.max(value, 0)),
            updatedAt: Date.now()
        });
    }, [weekStartKey]);

    const [showTargetDialog, setShowTargetDialog] = useState(false);
    const [notesProjectId, setNotesProjectId] = useState<number | null>(null);
    const [copiedToast, setCopiedToast] = useState<string | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const copyToClipboard = useCallback((text: string) => {
        void navigator.clipboard.writeText(text).then(() => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setCopiedToast("Copied to clipboard");
            toastTimeoutRef.current = setTimeout(() => setCopiedToast(null), 1500);
        });
    }, []);

    const safeBillableTarget = weeklyBillableTarget ?? DEFAULT_BILLABLE_TARGET_HOURS;
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

    const hasAnyDailyProjections = useMemo(
        () => tableRows.some(row => dateKeys.some(d => (row.dailyProjectedHours[d] || 0) > 0)),
        [tableRows, dateKeys]
    );

    const varianceRows = useMemo(
        () => tableRows.filter(row => {
            const hasActual = row.totalHours > 0;
            const hasProjection = dateKeys.some(d => (row.dailyProjectedHours[d] || 0) > 0);
            return hasActual || hasProjection;
        }),
        [tableRows, dateKeys]
    );

    const notesRow = useMemo(
        () => notesProjectId != null ? tableRows.find(r => r.projectId === notesProjectId) : undefined,
        [notesProjectId, tableRows]
    );

    const notesLifetimeHours = useLiveQuery(
        async () => {
            if (notesProjectId == null || !workspaceId) return 0;
            if (isManual) {
                const entries = await calendarDb.manualTimeEntries
                    .where("projectId").equals(notesProjectId).toArray();
                return entries.reduce((sum, e) => sum + (e.hours || 0), 0);
            }
            const entries = await calendarDb.togglTimeEntries
                .where("workspaceId").equals(workspaceId).toArray();
            return entries
                .filter(e => e.pid === notesProjectId)
                .reduce((sum, e) => sum + (e.dur || 0) / 3600000, 0);
        },
        [notesProjectId, workspaceId, isManual],
        0
    );

    const notesAllTaskDescriptions = useLiveQuery(
        async () => {
            if (notesProjectId == null || !workspaceId) return [];
            if (isManual) {
                const entries = await calendarDb.manualTimeEntries
                    .where("projectId").equals(notesProjectId).toArray();
                return entries
                    .filter(e => e.description?.trim())
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(e => `${e.date}: ${e.description}`);
            }
            const entries = await calendarDb.togglTimeEntries
                .where("workspaceId").equals(workspaceId).toArray();
            const descs = entries
                .filter(e => e.pid === notesProjectId && e.description?.trim())
                .sort((a, b) => (b.start || "").localeCompare(a.start || ""));
            const seen = new Set<string>();
            const result: string[] = [];
            for (const e of descs) {
                const text = e.description.trim();
                if (!seen.has(text)) {
                    seen.add(text);
                    result.push(text);
                }
            }
            return result;
        },
        [notesProjectId, workspaceId, isManual],
        []
    );

    const formatHoursForDisplay = useCallback((hours: number) => {
        return formatHours(hours, timeDisplayMode);
    }, [timeDisplayMode]);

    const formatVarianceSimple = useCallback((v: number) => {
        if (Math.abs(v) < 0.005) return "0";
        const sign = v > 0 ? "+" : "-";
        return sign + formatHoursForDisplay(Math.abs(v));
    }, [formatHoursForDisplay]);

    const formatVariance = useCallback((v: number) => {
        if (Math.abs(v) < 0.005) return "0";
        const sign = v > 0 ? "+" : "";
        return sign + formatHoursForDisplay(Math.abs(v)) + (v < 0 ? " short" : " over");
    }, [formatHoursForDisplay]);

    const dailyVarianceTotals = useMemo(
        () => dateKeys.reduce((acc: {[date: string]: number}, date) => {
            acc[date] = varianceRows.reduce((sum, row) => {
                return sum + ((row.dailyProjectedHours[date] || 0) - (row.dailyHours[date] || 0));
            }, 0);
            return acc;
        }, {}),
        [varianceRows, dateKeys]
    );

    const totalVariance = useMemo(
        () => Object.values(dailyVarianceTotals).reduce((a, b) => a + b, 0),
        [dailyVarianceTotals]
    );

    const renderDailyCellContent = useCallback((row: IWeekTableRow, date: string) => {
        const dayHours = row.dailyHours[date] || 0;
        const descriptionText = (row.dailyTaskDescriptions[date] || []).join(", ");
        const hasDescription = !!descriptionText;
        const timeText = dayHours > 0 ? formatHoursForDisplay(dayHours) : "";

        if (isManual && rowDisplayMode !== "projections") {
            return (
                <ManualTimeCell
                    projectId={row.projectId}
                    date={date}
                    hours={dayHours}
                    formatHoursFn={formatHoursForDisplay}
                    onTimeChange={(pid, d, h) => void upsertManualTime(pid, d, h)}
                />
            );
        }

        switch (rowDisplayMode) {
            case "description": {
                if (!hasDescription) return "";
                return (
                    <div className={"weekDayCellCopyable"} onClick={() => copyToClipboard(descriptionText)}>
                        <span className={"weekDayDescription"}>{descriptionText}</span>
                    </div>
                );
            }
            case "timeAndDescription": {
                if (!hasDescription && !timeText) return "";
                const copyText = [timeText, descriptionText].filter(Boolean).join(" — ");
                return (
                    <div className={"weekDayCellCombined weekDayCellCopyable"} onClick={() => copyToClipboard(copyText)}>
                        {timeText ? <strong>{timeText}</strong> : null}
                        {hasDescription ? <span className={"weekDayDescription"}>{descriptionText}</span> : null}
                    </div>
                );
            }
            case "projections":
                return (
                    <ProjectionCell
                        projectId={row.projectId}
                        date={date}
                        projectedHours={row.dailyProjectedHours[date] || 0}
                        onProjectionChange={(pid, d, h) => void upsertDailyProjection(pid, d, h)}
                    />
                );
            default: {
                if (!timeText) return "";
                return (
                    <div className={"weekDayCellCopyable"} onClick={() => copyToClipboard(timeText)}>
                        <span>{timeText}</span>
                    </div>
                );
            }
        }
    }, [copyToClipboard, formatHoursForDisplay, rowDisplayMode, upsertDailyProjection, isManual, upsertManualTime]);

    const columns = useMemo<ColumnDef<IWeekTableRow>[]>(() => {
        return [
            {
                id: "clientName",
                accessorFn: row => row.clientName,
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Client <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => <span className={"weekClientName"} style={{color: row.original.projectColor}}>{row.original.clientName || "-"}</span>
            },
            {
                id: "projectName",
                accessorFn: row => row.projectName,
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Project <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <button
                        className={"weekProjectButton"}
                        type={"button"}
                        onClick={() => void toggleProjectBillable(row.original.projectId, row.original.billable)}
                    >
                        <span className={"weekProjectName"} style={{color: row.original.projectColor}}>{row.original.projectName}</span>
                        <span className={row.original.billable ? "billableBadge billable" : "billableBadge nonBillable"}>
                            {row.original.billable ? "B" : "NB"}
                        </span>
                    </button>
                )
            },
            ...dateKeys.map(date => ({
                id: date,
                accessorFn: (row: IWeekTableRow) => row.dailyHours[date] || 0,
                header: ({column}: any) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        {dayjs(date).format("ddd D")} <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}: any) => renderDailyCellContent(row.original, date)
            })),
            {
                id: "totalHours",
                accessorFn: row => row.totalHours,
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
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
            },
            {
                id: "notes",
                header: () => <span style={{fontSize: "0.75rem", color: "var(--text-muted)"}}>Notes</span>,
                cell: ({row}) => (
                    <NotesButton
                        hasNotes={row.original.hasNotes}
                        onClick={() => setNotesProjectId(row.original.projectId)}
                    />
                ),
                enableSorting: false
            }
        ];
    }, [dateKeys, formatHoursForDisplay, renderDailyCellContent, toggleProjectBillable, upsertWeeklyPlan]);

    const varianceColumns = useMemo<ColumnDef<IWeekTableRow>[]>(() => {
        return [
            {
                id: "clientName",
                accessorFn: row => row.clientName,
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Client <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => <span className={"weekClientName"} style={{color: row.original.projectColor}}>{row.original.clientName || "-"}</span>
            },
            {
                id: "projectName",
                accessorFn: row => row.projectName,
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Project <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => (
                    <span style={{color: row.original.projectColor, fontWeight: 700}}>{row.original.projectName}</span>
                )
            },
            ...dateKeys.map(date => ({
                id: date,
                accessorFn: (row: IWeekTableRow) => (row.dailyProjectedHours[date] || 0) - (row.dailyHours[date] || 0),
                header: ({column}: any) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        {dayjs(date).format("ddd D")} <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}: any) => {
                    const projected = row.original.dailyProjectedHours[date] || 0;
                    const actual = row.original.dailyHours[date] || 0;
                    if (projected === 0 && actual === 0) {
                        return <span className={"varianceNeutral"}>—</span>;
                    }
                    const variance = projected - actual;
                    const hasVariance = Math.abs(variance) >= 0.005;
                    const cls = variance > 0.005 ? "varianceOver" : variance < -0.005 ? "varianceShort" : "varianceNeutral";
                    const descriptions = row.original.dailyTaskDescriptions[date] || [];
                    const showDescriptions = rowDisplayMode === "description" || rowDisplayMode === "timeAndDescription";

                    if (rowDisplayMode === "time") {
                        const copyText = formatVarianceSimple(variance);
                        return (
                            <div className={"weekDayCellCopyable"} onClick={() => copyToClipboard(copyText)}>
                                <span className={cls}>{copyText}</span>
                            </div>
                        );
                    }

                    const showHours = rowDisplayMode === "projections" || rowDisplayMode === "timeAndDescription";
                    const hoursPart = showHours
                        ? [
                            `P: ${projected > 0 ? formatHoursForDisplay(projected) : "—"}`,
                            `A: ${actual > 0 ? formatHoursForDisplay(actual) : "—"}`,
                            ...(hasVariance ? [formatVariance(variance)] : [])
                          ].join(", ")
                        : "";
                    const descPart = showDescriptions ? descriptions.join(", ") : "";
                    const copyText = [hoursPart, descPart].filter(Boolean).join(" — ");

                    return (
                        <div className={"weekDayCellCopyable"} onClick={() => copyToClipboard(copyText)}>
                            <div className={"varianceCell"}>
                                {showHours && (
                                    <>
                                        <span className={"varianceProjected"}>{projected > 0 ? formatHoursForDisplay(projected) : "—"}</span>
                                        <span className={"varianceActual"}>{actual > 0 ? formatHoursForDisplay(actual) : "—"}</span>
                                        {(projected > 0 || actual > 0) && hasVariance && (
                                            <span className={"varianceDiff " + cls}>{formatVariance(variance)}</span>
                                        )}
                                    </>
                                )}
                                {showDescriptions && (projected > 0 || actual > 0 || descriptions.length > 0) && (
                                    <div className={"varianceDescriptions"}>
                                        {hasVariance && (
                                            <span className={"varianceAnnotation"}>Adjusted from Projection</span>
                                        )}
                                        {descriptions.map((desc, i) => (
                                            <span key={i} className={"weekDayDescription"}>{desc}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }
            })),
            {
                id: "totalHours",
                accessorFn: (row: IWeekTableRow) => dateKeys.reduce((sum, date) => {
                    return sum + ((row.dailyProjectedHours[date] || 0) - (row.dailyHours[date] || 0));
                }, 0),
                header: ({column}) => (
                    <button className={"weekSortButton"} onClick={column.getToggleSortingHandler()} type={"button"}>
                        Variance <span>{sortSymbol(column.getIsSorted())}</span>
                    </button>
                ),
                cell: ({row}) => {
                    const rowVariance = dateKeys.reduce((sum, date) => {
                        return sum + ((row.original.dailyProjectedHours[date] || 0) - (row.original.dailyHours[date] || 0));
                    }, 0);
                    const cls = rowVariance > 0.005 ? "varianceOver" : rowVariance < -0.005 ? "varianceShort" : "varianceNeutral";
                    return (
                        <span className={cls}>
                            {rowDisplayMode === "time" ? formatVarianceSimple(rowVariance) : formatVariance(rowVariance)}
                        </span>
                    );
                }
            }
        ];
    }, [dateKeys, formatHoursForDisplay, formatVariance, formatVarianceSimple, rowDisplayMode, copyToClipboard]);

    const table = useReactTable({
        data: tableRows,
        columns,
        state: {sorting},
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: row => row.id
    });

    const varianceTable = useReactTable({
        data: varianceRows,
        columns: varianceColumns,
        state: {sorting: varianceSorting},
        onSortingChange: setVarianceSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: row => row.id
    });

    const [showConfigPrompt, setShowConfigPrompt] = useState(false);
    const {setDataMode} = useAppContext();

    if (!isManual && !selectedWorkspace) {
        return (
            <Layout>
                <div className={"welcomeContainer"}>
                    <div className={"welcomeHero"}>
                        <h1 className={"welcomeTitle"}>Toggl Calendar View</h1>
                        <p className={"welcomeSubtitle"}>
                            A visual weekly planner that connects to your Toggl account to display
                            tracked time alongside planned hours. Monitor progress, hit your targets,
                            and understand where your time goes.
                        </p>
                    </div>

                    <div className={"welcomeFeatures"}>
                        <div className={"welcomeFeature"}>
                            <div className={"welcomeFeatureIcon"} aria-hidden={"true"}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            </div>
                            <h3>Weekly Overview</h3>
                            <p>See all tracked time entries organized by project and day in a clear weekly table.</p>
                        </div>
                        <div className={"welcomeFeature"}>
                            <div className={"welcomeFeatureIcon"} aria-hidden={"true"}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <h3>Hour Targets</h3>
                            <p>Set projected hours per project and weekly billable targets to plan your time effectively.</p>
                        </div>
                        <div className={"welcomeFeature"}>
                            <div className={"welcomeFeatureIcon"} aria-hidden={"true"}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </div>
                            <h3>Billable Tracking</h3>
                            <p>Distinguish billable and non-billable work with visual progress indicators.</p>
                        </div>
                    </div>

                    <div className={"welcomeSetup"}>
                        <h2>Get Started</h2>
                        <ol className={"welcomeSteps"}>
                            <li>
                                Find your Toggl API token at{" "}
                                <a href={"https://toggl.com/app/profile"} target={"_blank"} rel={"noopener noreferrer"}>
                                    toggl.com/app/profile
                                </a>
                            </li>
                            <li>Click the button below to enter your API token</li>
                            <li>Select your workspace and start planning your week</li>
                        </ol>
                        <button
                            className={"welcomeButton"}
                            onClick={() => setShowConfigPrompt(true)}
                            type={"button"}
                        >
                            Get Started with Toggl
                        </button>
                        <div className={"welcomeDivider"}>
                            <span>or</span>
                        </div>
                        <button
                            className={"welcomeButton welcomeButtonManual"}
                            onClick={() => setDataMode("manual")}
                            type={"button"}
                        >
                            Use Manual Time Entry
                        </button>
                    </div>
                </div>
                <ConfigDialog open={showConfigPrompt} onClose={() => setShowConfigPrompt(false)}/>
            </Layout>
        );
    }

    const showLoading = projectsLoading || detailsLoading;
    const leafColumnCount = table.getAllLeafColumns().length;

    return (
        <Layout>
            <div className={"weekHeader"}>
                <div>
                    <strong>{weekStart.format("MMM D, YYYY")} - {weekEnd.format("MMM D, YYYY")}</strong>
                </div>
                <div className={"weekHeaderControls"}>
                    {!isManual && (
                        <SyncWeekButton
                            isSyncing={isSyncing}
                            syncError={syncError}
                            onSync={() => syncWeekRange(weekStartKey, weekEndKey)}
                            onClearError={() => setSyncError(false)}
                        />
                    )}
                    <CalendarDateNav
                        onTodayClick={isManual ? undefined : (start, end) => void syncWeekRange(start, end)}
                    />
                    <div className={"weekDisplayControls"}>
                        <div className={"weekDisplayButtonGroup"}>
                            <button
                                className={`weekHeaderButton ${timeDisplayMode === "rounded" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setTimeDisplayMode("rounded")}
                            >
                                Rounded
                            </button>
                            <button
                                className={`weekHeaderButton ${timeDisplayMode === "actual" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setTimeDisplayMode("actual")}
                            >
                                Actual
                            </button>
                        </div>
                        <div className={"weekDisplayButtonGroup"}>
                            <button
                                className={`weekHeaderButton ${rowDisplayMode === "time" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("time")}
                            >
                                Time
                            </button>
                            <button
                                className={`weekHeaderButton ${rowDisplayMode === "description" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("description")}
                            >
                                Descriptions
                            </button>
                            <button
                                className={`weekHeaderButton ${rowDisplayMode === "timeAndDescription" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("timeAndDescription")}
                            >
                                Time + Descriptions
                            </button>
                            <button
                                className={`weekHeaderButton ${rowDisplayMode === "projections" ? "selected" : ""}`}
                                type={"button"}
                                onClick={() => setRowDisplayMode("projections")}
                            >
                                Projections
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
                <button className={"weekHeaderButton"} onClick={() => setShowTargetDialog(true)}>
                    Edit Target
                </button>
            </div>
            <div className={"metricLegend"}>
                <span><strong>Current Billable:</strong> {formatHoursForDisplay(currentBillableHours)}</span>
                <span><strong>Projected:</strong> {formatHoursForDisplay(projectedHoursTotal)}</span>
                <span><strong>Target:</strong> {formatHoursForDisplay(safeBillableTarget)}</span>
            </div>

            <div className={"weekTableContainer"}>
                <table className={"weekTable"}>
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
                                <div className={"weekLoading"}>
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
                                    <div className={"weekNoRows"}>
                                        {isManual
                                            ? "No projects yet. Use the header to manage companies and projects, then search to add them."
                                            : "No projects yet. Track time or add a project to this week."
                                        }
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
                        <th/>
                    </tr>
                    <tr>
                        <th>Non-billable</th>
                        <th/>
                        {dateKeys.map(date => (
                            <th key={`non-billable-${date}`}>{formatHoursForDisplay(nonBillableSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>{formatHoursForDisplay(nonBillableSummary.totalHours)}{nonBillableSummary.projectedHours > 0 ? ` / ${formatHoursForDisplay(nonBillableSummary.projectedHours)}` : ""}</th>
                        <th/>
                    </tr>
                    <tr className={"summaryTotal"}>
                        <th>Total</th>
                        <th/>
                        {dateKeys.map(date => (
                            <th key={`total-${date}`}>{formatHoursForDisplay(totalSummary.dailyHours[date] || 0)}</th>
                        ))}
                        <th>
                            <WeeklyTargetCell
                                totalHours={totalSummary.totalHours}
                                targetHours={safeBillableTarget}
                                formatHours={formatHoursForDisplay}
                                onTargetChange={value => void updateWeeklyTarget(value)}
                            />
                        </th>
                        <th/>
                    </tr>
                    </tfoot>
                </table>
            </div>
            {hasAnyDailyProjections && varianceRows.length > 0 && (
                <div className={"varianceTableContainer"}>
                    <div className={"varianceTableTitle"}>Projection vs Actual</div>
                    <div className={"weekTableContainer"}>
                        <table className={"weekTable"}>
                            <thead>
                            {varianceTable.getHeaderGroups().map(headerGroup => (
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
                            {varianceTable.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className={"summaryTotal"}>
                                <th>Total</th>
                                <th/>
                                {dateKeys.map(date => {
                                    const v = dailyVarianceTotals[date] || 0;
                                    const cls = v > 0.005 ? "varianceOver" : v < -0.005 ? "varianceShort" : "varianceNeutral";
                                    const label = Math.abs(v) >= 0.005
                                        ? (rowDisplayMode === "time" ? formatVarianceSimple(v) : formatVariance(v))
                                        : "—";
                                    return <th key={date} className={cls}>{label}</th>;
                                })}
                                <th className={totalVariance > 0.005 ? "varianceOver" : totalVariance < -0.005 ? "varianceShort" : "varianceNeutral"}>
                                    {rowDisplayMode === "time" ? formatVarianceSimple(totalVariance) : formatVariance(totalVariance)}
                                </th>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            <InputDialog
                open={showTargetDialog}
                onClose={() => setShowTargetDialog(false)}
                onConfirm={value => void updateWeeklyTarget(value)}
                title={"Edit Weekly Target"}
                description={`Set your billable hours target for the week of ${weekStart.format("MMM D")} - ${weekEnd.format("MMM D, YYYY")}.`}
                label={"Hours per week"}
                defaultValue={safeBillableTarget}
            />
            {copiedToast && <div className={"copyToast"}>{copiedToast}</div>}
            {notesProjectId != null && notesRow && (
                <ProjectNotesDialog
                    open={true}
                    onClose={() => setNotesProjectId(null)}
                    workspaceId={workspaceId}
                    projectId={notesProjectId}
                    projectName={notesRow.projectName}
                    projectColor={notesRow.projectColor}
                    weeklyHours={notesRow.totalHours}
                    projectedHours={notesRow.projectedHours}
                    lifetimeHours={notesLifetimeHours ?? 0}
                    taskDescriptions={notesAllTaskDescriptions ?? []}
                    formatHours={formatHoursForDisplay}
                />
            )}
        </Layout>
    );
};