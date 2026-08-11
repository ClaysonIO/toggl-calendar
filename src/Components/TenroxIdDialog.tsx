import React, {useEffect, useRef, useState} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import {calendarDb, getProjectTenroxIdKey} from "../Utilities/calendarDb";
import "./InputDialog.css";

interface TenroxIdDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    projectId: number;
    projectName: string;
}

const FIELDS = [
    {name: "project", label: "Project"},
    {name: "task", label: "Task"},
    {name: "charge", label: "Charge"},
    {name: "assignmentId", label: "Assignment ID"}
] as const;

type FieldName = typeof FIELDS[number]["name"];
type FieldValues = Record<FieldName, string>;

const EMPTY_VALUES: FieldValues = {project: "", task: "", charge: "", assignmentId: ""};

export const TenroxIdDialog = ({open, onClose, workspaceId, projectId, projectName}: TenroxIdDialogProps) => {
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [values, setValues] = useState<FieldValues>(EMPTY_VALUES);
    const key = getProjectTenroxIdKey(workspaceId, projectId);

    const existing = useLiveQuery(
        () => calendarDb.projectTenroxIds.get(key),
        [key]
    );

    useEffect(() => {
        if (open) {
            setValues({
                project: existing?.project ?? "",
                task: existing?.task ?? "",
                charge: existing?.charge ?? "",
                assignmentId: existing?.assignmentId ?? ""
            });
            setTimeout(() => {
                firstInputRef.current?.focus();
                firstInputRef.current?.select();
            }, 50);
        }
        // Re-seed only when the dialog opens or targets a different project,
        // not on every live-query update (which would clobber in-progress typing).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, key, existing !== undefined]);

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        const parts = text.split(/\t|\r?\n/).map(p => p.trim()).filter(p => p !== "");
        if (parts.length < 2) return;
        e.preventDefault();
        setValues({
            project: parts[0] ?? "",
            task: parts[1] ?? "",
            charge: parts[2] ?? "",
            assignmentId: parts[3] ?? ""
        });
    };

    const handleSave = async () => {
        const project = values.project.trim();
        const task = values.task.trim();
        const charge = values.charge.trim();
        const assignmentId = values.assignmentId.trim();
        if (!project && !task && !charge && !assignmentId) {
            await calendarDb.projectTenroxIds.delete(key);
        } else {
            await calendarDb.projectTenroxIds.put({
                key,
                workspaceId,
                projectId,
                project,
                task,
                charge,
                assignmentId,
                updatedAt: Date.now()
            });
        }
        onClose();
    };

    if (!open) return null;

    return (
        <div className={"inputDialogOverlay"} onClick={onClose}>
            <div className={"inputDialog"} onClick={e => e.stopPropagation()}>
                <div className={"inputDialogHeader"}>
                    <h3>Tenrox IDs — {projectName}</h3>
                    <button className={"inputDialogClose"} onClick={onClose} type={"button"}>&times;</button>
                </div>
                <p className={"inputDialogDescription"}>
                    Paste a row of four cells from Excel into any field to fill all four at once.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    {FIELDS.map((field, index) => (
                        <React.Fragment key={field.name}>
                            <label className={"inputDialogLabel"} htmlFor={`tenroxField-${field.name}`}>{field.label}</label>
                            <input
                                id={`tenroxField-${field.name}`}
                                ref={index === 0 ? firstInputRef : undefined}
                                className={"inputDialogField"}
                                type={"text"}
                                value={values[field.name]}
                                onChange={e => setValues(prev => ({...prev, [field.name]: e.target.value}))}
                                onPaste={handlePaste}
                            />
                        </React.Fragment>
                    ))}
                    <div className={"inputDialogActions"}>
                        <button className={"inputDialogCancel"} onClick={onClose} type={"button"}>Cancel</button>
                        <button className={"inputDialogConfirm"} type={"submit"}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
