import React, {useCallback, useMemo, useState} from "react";
import {Layout} from "../Components/Layout";
import {useAppContext} from "../Utilities/AppContext";
import {useLiveQuery} from "dexie-react-hooks";
import dayjs from "dayjs";
import {
    calendarDb,
    MANUAL_WORKSPACE_ID,
    START_OF_YEAR_MONTH_KEY,
    getProjectPreferenceKey
} from "../Utilities/calendarDb";
import {getSimpleDataFromDexie} from "../Utilities/togglDetailsFromDexie";
import {getManualSimpleData} from "../Utilities/manualData";
import {getFiscalYearBounds} from "../Utilities/fiscalYear";
import {formatHoursDisplay} from "../Utilities/yearViewUtils";
import type {IManualCompany, IManualProject} from "../Utilities/calendarDb";
import {PROJECT_COLORS} from "../Utilities/manualData";
import "./Projects.css";

type TimeDisplayMode = "rounded" | "actual";

interface ProjectRow {
    id: number;
    name: string;
    color?: string;
    totalHours: number;
    billable: boolean;
}

interface CompanyRow {
    id: string;
    name: string;
    projects: ProjectRow[];
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    /** Manual mode: company id for adding projects */
    manualCompanyId?: number;
}

export const ProjectsPage = () => {
    const {dataMode, selectedWorkspace} = useAppContext();
    const isManual = dataMode === "manual";
    const workspaceId = isManual ? MANUAL_WORKSPACE_ID : (selectedWorkspace?.id ?? 0);

    const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(new Set());
    const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>("rounded");
    const [selectedFyLabel, setSelectedFyLabel] = useState<string | null>(null);

    const startOfYearSetting = useLiveQuery(
        () => calendarDb.settings.get(START_OF_YEAR_MONTH_KEY),
        [],
        undefined
    );
    const startMonth = Math.min(12, Math.max(1, startOfYearSetting?.value ?? 1));

    const fiscalYear = useMemo(() => {
        const refDate = selectedFyLabel
            ? (() => {
                const startYear = startMonth === 1 ? selectedFyLabel : String(Number(selectedFyLabel) - 1);
                return dayjs(`${startYear}-${String(startMonth).padStart(2, "0")}-15`);
            })()
            : dayjs();
        return getFiscalYearBounds(refDate, startMonth);
    }, [startMonth, selectedFyLabel]);
    const {startKey: fyStartKey, endKey: fyEndKey} = fiscalYear;

    const tableData = useLiveQuery(
        async (): Promise<CompanyRow[]> => {
            if (!fyStartKey || !fyEndKey) return [];
            if (isManual) {
                const [companies, projects, simpleData, prefs] = await Promise.all([
                    calendarDb.manualCompanies.toArray(),
                    calendarDb.manualProjects.toArray(),
                    getManualSimpleData(fyStartKey, fyEndKey),
                    calendarDb.projectPreferences.where("workspaceId").equals(MANUAL_WORKSPACE_ID).toArray()
                ]);
                const prefsByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
                    acc[p.projectId] = p.billable;
                    return acc;
                }, {});
                const companyById = new Map(companies.map(c => [c.id!, c]));
                const projectsByCompany = (projects as IManualProject[]).reduce<Record<number, IManualProject[]>>((acc, p) => {
                    (acc[p.companyId] ??= []).push(p);
                    return acc;
                }, {});
                return (companies as IManualCompany[]).map(company => {
                    const companyProjects = projectsByCompany[company.id!] ?? [];
                    const projectRows: ProjectRow[] = companyProjects.map(proj => {
                        const data = simpleData[proj.id!];
                        let totalHours = 0;
                        if (data?.dates) {
                            for (const day of Object.values(data.dates)) totalHours += day.hours ?? 0;
                        }
                        const billable = prefsByProject[proj.id!] ?? true;
                        return {
                            id: proj.id!,
                            name: proj.name,
                            color: proj.color,
                            totalHours,
                            billable
                        };
                    });
                    const billableHours = projectRows.filter(p => p.billable).reduce((s, p) => s + p.totalHours, 0);
                    const nonBillableHours = projectRows.filter(p => !p.billable).reduce((s, p) => s + p.totalHours, 0);
                    return {
                        id: `manual-${company.id}`,
                        name: company.name,
                        projects: projectRows,
                        totalHours: billableHours + nonBillableHours,
                        billableHours,
                        nonBillableHours,
                        manualCompanyId: company.id
                    };
                });
            }
            if (!workspaceId) return [];
            const [simpleData, prefs] = await Promise.all([
                getSimpleDataFromDexie(workspaceId, fyStartKey, fyEndKey),
                calendarDb.projectPreferences.where("workspaceId").equals(workspaceId).toArray()
            ]);
            if (!simpleData) return [];
            const prefsByProject = prefs.reduce<Record<number, boolean>>((acc, p) => {
                acc[p.projectId] = p.billable;
                return acc;
            }, {});
            const byCompany = new Map<string, ProjectRow[]>();
            for (const [pidStr, data] of Object.entries(simpleData)) {
                const pid = Number(pidStr);
                let totalHours = 0;
                if (data?.dates) {
                    for (const day of Object.values(data.dates)) totalHours += day.hours ?? 0;
                }
                const companyName = data.client_name ?? "No client";
                const list = byCompany.get(companyName) ?? [];
                list.push({
                    id: pid,
                    name: data.project_name ?? "",
                    color: data.project_hex_color,
                    totalHours,
                    billable: prefsByProject[pid] ?? true
                });
                byCompany.set(companyName, list);
            }
            return Array.from(byCompany.entries()).map(([name, projects]) => {
                const billableHours = projects.filter(p => p.billable).reduce((s, p) => s + p.totalHours, 0);
                const nonBillableHours = projects.filter(p => !p.billable).reduce((s, p) => s + p.totalHours, 0);
                return {
                    id: `toggl-${name}`,
                    name,
                    projects,
                    totalHours: billableHours + nonBillableHours,
                    billableHours,
                    nonBillableHours
                };
            });
        },
        [workspaceId, fyStartKey, fyEndKey, isManual],
        []
    );

    const companies = tableData ?? [];
    const currentFyLabel = useMemo(() => getFiscalYearBounds(dayjs(), startMonth).label, [startMonth]);

    const toggleExpanded = useCallback((id: string) => {
        setExpandedCompanyIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const [newCompanyName, setNewCompanyName] = useState("");
    const [addingProjectFor, setAddingProjectFor] = useState<number | null>(null);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

    const addCompany = useCallback(async () => {
        const trimmed = newCompanyName.trim();
        if (!trimmed) return;
        await calendarDb.manualCompanies.add({name: trimmed, updatedAt: Date.now()});
        setNewCompanyName("");
    }, [newCompanyName]);

    const addProject = useCallback(async (companyId: number) => {
        const trimmed = newProjectName.trim();
        if (!trimmed) return;
        const projectId = await calendarDb.manualProjects.add({
            companyId,
            name: trimmed,
            color: newProjectColor,
            updatedAt: Date.now()
        });
        await calendarDb.projectPreferences.put({
            key: getProjectPreferenceKey(MANUAL_WORKSPACE_ID, projectId),
            workspaceId: MANUAL_WORKSPACE_ID,
            projectId,
            billable: true,
            updatedAt: Date.now()
        });
        setNewProjectName("");
        setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
        setAddingProjectFor(null);
    }, [newProjectName, newProjectColor]);

    if (!isManual && !selectedWorkspace) {
        return (
            <Layout>
                <div className={"projectsWelcome"}>
                    <h2>Projects</h2>
                    <p>Select a workspace in Config to see projects and hours, or switch to Manual mode.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={"projectsPage"}>
                <div className={"projectsHeader"}>
                    <h2>Projects — FY{fiscalYear.label}</h2>
                    <div className={"projectsControls"}>
                        <div className={"projectsFyNav"}>
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={() => setSelectedFyLabel(String(Number(fiscalYear.label) - 1))}
                            >
                                &lt;
                            </button>
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={() => setSelectedFyLabel(null)}
                            >
                                Today
                            </button>
                            <button
                                type={"button"}
                                className={"calendarHeaderButton"}
                                onClick={() => setSelectedFyLabel(String(Number(fiscalYear.label) + 1))}
                            >
                                &gt;
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
                    </div>
                </div>

                {isManual && (
                    <div className={"projectsAddCompany"}>
                        <input
                            className={"projectsInput"}
                            type={"text"}
                            placeholder={"New company name..."}
                            value={newCompanyName}
                            onChange={e => setNewCompanyName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") void addCompany(); }}
                        />
                        <button
                            className={"projectsButton projectsButtonPrimary"}
                            onClick={() => void addCompany()}
                            disabled={!newCompanyName.trim()}
                        >
                            Add company
                        </button>
                    </div>
                )}

                <div className={"projectsTableWrap"}>
                    <table className={"projectsTable"}>
                        <thead>
                            <tr>
                                <th className={"projectsColName"}>Company / Project</th>
                                <th className={"projectsColHours"}>Total hours</th>
                                <th className={"projectsColHours"}>Billable</th>
                                <th className={"projectsColHours"}>Non-billable</th>
                                {isManual && <th className={"projectsColActions"}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {companies.length === 0 && (
                                <tr>
                                    <td colSpan={isManual ? 5 : 4} className={"projectsEmpty"}>
                                        {isManual
                                            ? "No companies yet. Add one above to get started."
                                            : "No project data for this fiscal year. Sync your Toggl workspace from the Year page."}
                                    </td>
                                </tr>
                            )}
                            {companies.map(company => (
                                <React.Fragment key={company.id}>
                                    <tr
                                        className={"projectsCompanyRow"}
                                        onClick={() => toggleExpanded(company.id)}
                                    >
                                        <td className={"projectsColName"}>
                                            <span className={`projectsExpandIcon ${expandedCompanyIds.has(company.id) ? "expanded" : ""}`}>▸</span>
                                            <span>{company.name}</span>
                                        </td>
                                        <td className={"projectsColHours"}>{formatHoursDisplay(company.totalHours, timeDisplayMode)}</td>
                                        <td className={"projectsColHours"}>{formatHoursDisplay(company.billableHours, timeDisplayMode)}</td>
                                        <td className={"projectsColHours"}>{formatHoursDisplay(company.nonBillableHours, timeDisplayMode)}</td>
                                        {isManual && <td className={"projectsColActions"} />}
                                    </tr>
                                    {expandedCompanyIds.has(company.id) && company.projects.map(project => (
                                        <tr key={project.id} className={"projectsProjectRow"}>
                                            <td className={"projectsColName"}>
                                                <span className={"projectsProjectIndent"} />
                                                {project.color && <span className={"projectsProjectColor"} style={{background: project.color}} />}
                                                <span>{project.name}</span>
                                            </td>
                                            <td className={"projectsColHours"}>{formatHoursDisplay(project.totalHours, timeDisplayMode)}</td>
                                            <td className={"projectsColHours"}>{project.billable ? formatHoursDisplay(project.totalHours, timeDisplayMode) : "—"}</td>
                                            <td className={"projectsColHours"}>{!project.billable ? formatHoursDisplay(project.totalHours, timeDisplayMode) : "—"}</td>
                                            {isManual && <td className={"projectsColActions"} />}
                                        </tr>
                                    ))}
                                    {isManual && expandedCompanyIds.has(company.id) && (
                                        addingProjectFor === company.manualCompanyId ? (
                                            <tr className={"projectsAddProjectRow"}>
                                                <td colSpan={5} className={"projectsColName"}>
                                                    <span className={"projectsProjectIndent"} />
                                                    <input
                                                        className={"projectsInput projectsInputSmall"}
                                                        type={"text"}
                                                        placeholder={"Project name..."}
                                                        value={newProjectName}
                                                        onChange={e => setNewProjectName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter" && company.manualCompanyId != null) void addProject(company.manualCompanyId);
                                                            if (e.key === "Escape") setAddingProjectFor(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                    <div className={"projectsColorPicker"}>
                                                        {PROJECT_COLORS.map(c => (
                                                            <button
                                                                key={c}
                                                                type={"button"}
                                                                className={`projectsColorSwatch ${newProjectColor === c ? "selected" : ""}`}
                                                                style={{background: c}}
                                                                onClick={() => setNewProjectColor(c)}
                                                                title={c}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button
                                                        className={"projectsButton projectsButtonSmall projectsButtonPrimary"}
                                                        onClick={() => { if (company.manualCompanyId != null) void addProject(company.manualCompanyId); }}
                                                        disabled={!newProjectName.trim()}
                                                    >
                                                        Add
                                                    </button>
                                                    <button className={"projectsButton projectsButtonSmall"} onClick={() => setAddingProjectFor(null)}>Cancel</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr className={"projectsAddProjectRow"}>
                                                <td colSpan={5} className={"projectsColName"}>
                                                    <span className={"projectsProjectIndent"} />
                                                    <button
                                                        type={"button"}
                                                        className={"projectsAddProjectButton"}
                                                        onClick={() => {
                                                            setAddingProjectFor(company.manualCompanyId ?? null);
                                                            setNewProjectName("");
                                                            setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
                                                        }}
                                                    >
                                                        + Add project
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};
