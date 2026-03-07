import React, {useCallback, useRef, useState} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import dayjs from "dayjs";
import {calendarDb, getManualTimeEntryKey} from "../Utilities/calendarDb";

interface Props {
    date: string;
    onClose: () => void;
}

export const ManualDayTimeDialog = ({date, onClose}: Props) => {
    const pointerDownOnOverlay = useRef(false);

    const projects = useLiveQuery(() => calendarDb.manualProjects.toArray(), [], []);
    const companies = useLiveQuery(() => calendarDb.manualCompanies.toArray(), [], []);
    const entries = useLiveQuery(
        () => calendarDb.manualTimeEntries.where("date").equals(date).toArray(),
        [date],
        []
    );

    const safeProjects = projects ?? [];
    const safeCompanies = companies ?? [];
    const safeEntries = entries ?? [];

    const companyById = new Map(safeCompanies.map(c => [c.id!, c]));
    const entryByProject = new Map(safeEntries.map(e => [e.projectId, e]));

    const [values, setValues] = useState<Record<number, string>>(() => {
        const init: Record<number, string> = {};
        safeEntries.forEach(e => { init[e.projectId] = String(e.hours); });
        return init;
    });

    const getValue = useCallback((projectId: number) => {
        if (values[projectId] !== undefined) return values[projectId];
        const entry = entryByProject.get(projectId);
        return entry ? String(entry.hours) : "0";
    }, [values, entryByProject]);

    const handleChange = useCallback((projectId: number, val: string) => {
        setValues(prev => ({...prev, [projectId]: val}));
    }, []);

    const handleSave = useCallback(async () => {
        const ops: Promise<unknown>[] = [];
        for (const project of safeProjects) {
            const pid = project.id!;
            const raw = values[pid];
            if (raw === undefined) continue;
            const parsed = Number(raw);
            const hours = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            const key = getManualTimeEntryKey(pid, date);
            if (hours === 0) {
                ops.push(calendarDb.manualTimeEntries.delete(key));
            } else {
                ops.push(calendarDb.manualTimeEntries.put({
                    key,
                    projectId: pid,
                    date,
                    hours,
                    description: "",
                    updatedAt: Date.now()
                }));
            }
        }
        await Promise.all(ops);
        onClose();
    }, [safeProjects, values, date, onClose]);

    const handleOverlayClick = () => {
        if (pointerDownOnOverlay.current) onClose();
    };

    if (!safeProjects.length) {
        return (
            <div
                className={"yearEditDayPopup"}
                onPointerDown={() => { pointerDownOnOverlay.current = true; }}
                onClick={handleOverlayClick}
            >
                <div
                    className={"yearEditDayContent"}
                    onPointerDown={e => { e.stopPropagation(); pointerDownOnOverlay.current = false; }}
                    onClick={e => e.stopPropagation()}
                    style={{minWidth: 280}}
                >
                    <label>Time for {dayjs(date).format("MMM D, YYYY")}</label>
                    <p style={{color: "var(--text-muted)", fontSize: "0.85rem", margin: "12px 0"}}>
                        No projects yet. Create companies and projects first using the "Manage Projects" button.
                    </p>
                    <div className={"yearEditDayActions"}>
                        <button type={"button"} onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={"yearEditDayPopup"}
            onPointerDown={() => { pointerDownOnOverlay.current = true; }}
            onClick={handleOverlayClick}
        >
            <div
                className={"yearEditDayContent manualDayContent"}
                onPointerDown={e => { e.stopPropagation(); pointerDownOnOverlay.current = false; }}
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={e => { e.preventDefault(); void handleSave(); }}>
                    <label style={{fontWeight: 600, marginBottom: 8, display: "block"}}>
                        Time for {dayjs(date).format("MMM D, YYYY")}
                    </label>
                    <div className={"manualDayProjectList"}>
                        {safeProjects.map(project => {
                            const company = companyById.get(project.companyId);
                            return (
                                <div key={project.id} className={"manualDayProjectRow"}>
                                    <span className={"manualDayProjectColor"} style={{background: project.color}}/>
                                    <span className={"manualDayProjectLabel"}>
                                        {company?.name ? `${company.name} - ` : ""}{project.name}
                                    </span>
                                    <input
                                        className={"manualDayHoursInput"}
                                        type={"number"}
                                        min={0}
                                        step={0.25}
                                        value={getValue(project.id!)}
                                        onChange={e => handleChange(project.id!, e.target.value)}
                                    />
                                    <span className={"manualDayHoursLabel"}>hrs</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className={"yearEditDayActions"}>
                        <button type={"button"} onClick={onClose}>Cancel</button>
                        <button type={"submit"} className={"primary"}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
