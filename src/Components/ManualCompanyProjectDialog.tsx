import React, {useCallback, useEffect, useRef, useState} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import {calendarDb, IManualCompany, IManualProject} from "../Utilities/calendarDb";
import {PROJECT_COLORS} from "../Utilities/manualData";
import "./ManualCompanyProjectDialog.css";

interface Props {
    open: boolean;
    onClose: () => void;
}

const ColorPicker = ({value, onChange}: {value: string; onChange: (c: string) => void}) => (
    <div className={"mcpColorPicker"}>
        {PROJECT_COLORS.map(c => (
            <button
                key={c}
                type={"button"}
                className={`mcpColorSwatch ${value === c ? "selected" : ""}`}
                style={{background: c}}
                onClick={() => onChange(c)}
                title={c}
            />
        ))}
    </div>
);

const InlineEdit = ({value, onSave, placeholder}: {value: string; onSave: (v: string) => void; placeholder?: string}) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setText(value); }, [value]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    const commit = () => {
        setEditing(false);
        const trimmed = text.trim();
        if (trimmed && trimmed !== value) onSave(trimmed);
        else setText(value);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                className={"mcpInlineInput"}
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setText(value); setEditing(false); } }}
                autoFocus
            />
        );
    }

    return (
        <span className={"mcpInlineText"} onClick={() => setEditing(true)} title={"Click to rename"}>
            {value || <em>{placeholder ?? "Unnamed"}</em>}
        </span>
    );
};

export const ManualCompanyProjectDialog = ({open, onClose}: Props) => {
    const [newCompanyName, setNewCompanyName] = useState("");
    const [addingProjectFor, setAddingProjectFor] = useState<number | null>(null);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

    const companies = useLiveQuery(() => calendarDb.manualCompanies.toArray(), [], []);
    const projects = useLiveQuery(() => calendarDb.manualProjects.toArray(), [], []);

    const safeCompanies = (companies ?? []) as IManualCompany[];
    const safeProjects = (projects ?? []) as IManualProject[];

    const projectsByCompany = safeProjects.reduce<Record<number, IManualProject[]>>((acc, p) => {
        (acc[p.companyId] ??= []).push(p);
        return acc;
    }, {});

    const addCompany = useCallback(async () => {
        const trimmed = newCompanyName.trim();
        if (!trimmed) return;
        await calendarDb.manualCompanies.add({name: trimmed, updatedAt: Date.now()});
        setNewCompanyName("");
    }, [newCompanyName]);

    const renameCompany = useCallback(async (id: number, name: string) => {
        await calendarDb.manualCompanies.update(id, {name, updatedAt: Date.now()});
    }, []);

    const deleteCompany = useCallback(async (id: number) => {
        const companyProjects = safeProjects.filter(p => p.companyId === id);
        const projectIds = companyProjects.map(p => p.id!);
        await calendarDb.transaction("rw", [calendarDb.manualCompanies, calendarDb.manualProjects, calendarDb.manualTimeEntries], async () => {
            for (const pid of projectIds) {
                await calendarDb.manualTimeEntries.where("projectId").equals(pid).delete();
            }
            await calendarDb.manualProjects.where("companyId").equals(id).delete();
            await calendarDb.manualCompanies.delete(id);
        });
    }, [safeProjects]);

    const addProject = useCallback(async (companyId: number) => {
        const trimmed = newProjectName.trim();
        if (!trimmed) return;
        await calendarDb.manualProjects.add({
            companyId,
            name: trimmed,
            color: newProjectColor,
            updatedAt: Date.now()
        });
        setNewProjectName("");
        setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
        setAddingProjectFor(null);
    }, [newProjectName, newProjectColor]);

    const renameProject = useCallback(async (id: number, name: string) => {
        await calendarDb.manualProjects.update(id, {name, updatedAt: Date.now()});
    }, []);

    const changeProjectColor = useCallback(async (id: number, color: string) => {
        await calendarDb.manualProjects.update(id, {color, updatedAt: Date.now()});
    }, []);

    const deleteProject = useCallback(async (id: number) => {
        await calendarDb.transaction("rw", [calendarDb.manualProjects, calendarDb.manualTimeEntries], async () => {
            await calendarDb.manualTimeEntries.where("projectId").equals(id).delete();
            await calendarDb.manualProjects.delete(id);
        });
    }, []);

    if (!open) return null;

    return (
        <div className={"mcpOverlay"} onClick={onClose}>
            <div className={"mcpDialog"} onClick={e => e.stopPropagation()}>
                <div className={"mcpHeader"}>
                    <h3>Manage Companies &amp; Projects</h3>
                    <button className={"mcpClose"} onClick={onClose} type={"button"}>&times;</button>
                </div>

                <div className={"mcpAddCompany"}>
                    <input
                        className={"mcpInput"}
                        type={"text"}
                        placeholder={"New company name..."}
                        value={newCompanyName}
                        onChange={e => setNewCompanyName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void addCompany(); }}
                    />
                    <button className={"mcpButton mcpButtonPrimary"} onClick={() => void addCompany()} disabled={!newCompanyName.trim()}>
                        + Add Company
                    </button>
                </div>

                <div className={"mcpList"}>
                    {safeCompanies.length === 0 && (
                        <p className={"mcpEmpty"}>No companies yet. Add one above to get started.</p>
                    )}
                    {safeCompanies.map(company => (
                        <div key={company.id} className={"mcpCompanySection"}>
                            <div className={"mcpCompanyRow"}>
                                <InlineEdit
                                    value={company.name}
                                    onSave={name => void renameCompany(company.id!, name)}
                                />
                                <button
                                    className={"mcpDeleteButton"}
                                    onClick={() => { if (confirm(`Delete "${company.name}" and all its projects?`)) void deleteCompany(company.id!); }}
                                    title={"Delete company"}
                                    type={"button"}
                                >
                                    &times;
                                </button>
                            </div>
                            <div className={"mcpProjectList"}>
                                {(projectsByCompany[company.id!] ?? []).map(project => (
                                    <div key={project.id} className={"mcpProjectRow"}>
                                        <span className={"mcpProjectColor"} style={{background: project.color}}/>
                                        <InlineEdit
                                            value={project.name}
                                            onSave={name => void renameProject(project.id!, name)}
                                        />
                                        <ColorPicker
                                            value={project.color}
                                            onChange={c => void changeProjectColor(project.id!, c)}
                                        />
                                        <button
                                            className={"mcpDeleteButton"}
                                            onClick={() => { if (confirm(`Delete project "${project.name}"?`)) void deleteProject(project.id!); }}
                                            title={"Delete project"}
                                            type={"button"}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                                {addingProjectFor === company.id ? (
                                    <div className={"mcpAddProjectRow"}>
                                        <input
                                            className={"mcpInput mcpInputSmall"}
                                            type={"text"}
                                            placeholder={"Project name..."}
                                            value={newProjectName}
                                            onChange={e => setNewProjectName(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") void addProject(company.id!); if (e.key === "Escape") setAddingProjectFor(null); }}
                                            autoFocus
                                        />
                                        <ColorPicker value={newProjectColor} onChange={setNewProjectColor}/>
                                        <button className={"mcpButton mcpButtonSmall mcpButtonPrimary"} onClick={() => void addProject(company.id!)} disabled={!newProjectName.trim()}>Add</button>
                                        <button className={"mcpButton mcpButtonSmall"} onClick={() => setAddingProjectFor(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button
                                        className={"mcpAddProjectButton"}
                                        onClick={() => { setAddingProjectFor(company.id!); setNewProjectName(""); setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]); }}
                                        type={"button"}
                                    >
                                        + Add Project
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
