import React, {useEffect, useRef, useState} from "react";
import "./InputDialog.css";

interface InputDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    title: string;
    description?: string;
    label: string;
    defaultValue: number;
    min?: number;
    step?: number;
}

export const InputDialog = ({open, onClose, onConfirm, title, description, label, defaultValue, min = 0, step = 0.25}: InputDialogProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setError("");
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [open]);

    const handleConfirm = () => {
        const value = Number(inputRef.current?.value);
        if (!Number.isFinite(value) || value < 0) {
            setError("Please enter a valid non-negative number.");
            return;
        }
        onConfirm(value);
        onClose();
    };

    if (!open) return null;

    return (
        <div className={"inputDialogOverlay"} onClick={onClose}>
            <div className={"inputDialog"} onClick={e => e.stopPropagation()}>
                <div className={"inputDialogHeader"}>
                    <h3>{title}</h3>
                    <button className={"inputDialogClose"} onClick={onClose} type={"button"}>&times;</button>
                </div>
                {description && <p className={"inputDialogDescription"}>{description}</p>}
                <label className={"inputDialogLabel"} htmlFor={"inputDialogField"}>{label}</label>
                <input
                    id={"inputDialogField"}
                    ref={inputRef}
                    className={"inputDialogField"}
                    type={"number"}
                    min={min}
                    step={step}
                    defaultValue={defaultValue}
                    onKeyDown={e => { if (e.key === "Enter") handleConfirm(); }}
                />
                {error && <p className={"inputDialogError"}>{error}</p>}
                <div className={"inputDialogActions"}>
                    <button className={"inputDialogCancel"} onClick={onClose} type={"button"}>Cancel</button>
                    <button className={"inputDialogConfirm"} onClick={handleConfirm} type={"button"}>Save</button>
                </div>
            </div>
        </div>
    );
};
