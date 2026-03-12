import React, {useEffect, useRef, useState} from "react";

const roundToQuarterHour = (h: number) => Math.round(h * 4) / 4;

export function WeekBillableTargetDialog({
    open,
    weekLabel,
    currentTarget,
    onSave,
    onClose
}: {
    open: boolean;
    weekLabel: string;
    currentTarget: number | null;
    onSave: (value: number | null) => void;
    onClose: () => void;
}) {
    const [hoursInput, setHoursInput] = useState(
        () => (currentTarget != null && currentTarget > 0 ? String(roundToQuarterHour(currentTarget)) : "")
    );
    const pointerDownOnOverlay = useRef(false);

    useEffect(() => {
        if (open) {
            setHoursInput(currentTarget != null && currentTarget > 0 ? String(roundToQuarterHour(currentTarget)) : "");
        }
    }, [open, currentTarget]);

    if (!open) return null;

    const handleSave = () => {
        const trimmed = hoursInput.trim();
        if (trimmed === "") {
            onSave(null);
            onClose();
            return;
        }
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed) && parsed >= 0) {
            onSave(roundToQuarterHour(parsed));
            onClose();
        }
    };

    const handleOverlayClick = () => {
        if (pointerDownOnOverlay.current) onClose();
    };

    return (
        <div
            className={"yearEditDayPopup"}
            onPointerDown={() => { pointerDownOnOverlay.current = true; }}
            onClick={handleOverlayClick}
        >
            <div
                className={"yearEditDayContent"}
                onPointerDown={(e) => { e.stopPropagation(); pointerDownOnOverlay.current = false; }}
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: 280 }}
            >
                <h3 style={{ marginTop: 0 }}>Billable target — {weekLabel}</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <label htmlFor={"weekBillableTargetHours"}>Billable hours</label>
                    <input
                        id={"weekBillableTargetHours"}
                        type={"number"}
                        min={0}
                        step={0.25}
                        placeholder={"No target"}
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                    />
                    <div className={"yearEditDayActions"} style={{ marginTop: 12 }}>
                        <button type={"button"} onClick={onClose}>Cancel</button>
                        <button type={"submit"} className={"primary"}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
