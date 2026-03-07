import React, {useRef, useState} from "react";
import {calendarDb, ANNUAL_TARGET_HOURS_KEY, ANNUAL_TARGET_PERCENTAGE_KEY} from "../Utilities/calendarDb";
import {FULL_TIME_HOURS} from "../Utilities/yearViewUtils";

export function YearEditTargetDialog({
    annualTargetHours,
    annualTargetPct,
    onClose
}: {
    annualTargetHours: number;
    annualTargetPct?: number;
    onClose: () => void;
}) {
    const [hoursInput, setHoursInput] = useState(String(annualTargetHours));
    const [pctInput, setPctInput] = useState(
        annualTargetPct != null ? String(annualTargetPct) : String(Math.round((annualTargetHours / FULL_TIME_HOURS) * 100))
    );
    const pointerDownOnOverlay = useRef(false);

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setHoursInput(raw);
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed >= 0) {
            const pct = Math.round((parsed / FULL_TIME_HOURS) * 100);
            setPctInput(String(Math.min(100, Math.max(0, pct))));
        }
    };
    const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setPctInput(raw);
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
            setHoursInput(String(Math.round((parsed / 100) * FULL_TIME_HOURS)));
        }
    };

    const handleSave = async () => {
        const hours = Number(hoursInput);
        const pct = Number(pctInput);
        const now = Date.now();
        if (Number.isFinite(hours) && hours >= 0) {
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_HOURS_KEY,
                value: hours,
                updatedAt: now
            });
            const derivedPct = Math.round((hours / FULL_TIME_HOURS) * 100);
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_PERCENTAGE_KEY,
                value: Math.min(100, Math.max(0, derivedPct)),
                updatedAt: now
            });
        } else if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
            const derivedHours = (pct / 100) * FULL_TIME_HOURS;
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_HOURS_KEY,
                value: Math.round(derivedHours),
                updatedAt: now
            });
            await calendarDb.settings.put({
                key: ANNUAL_TARGET_PERCENTAGE_KEY,
                value: pct,
                updatedAt: now
            });
        }
        onClose();
    };

    const handleTargetOverlayClick = () => {
        if (pointerDownOnOverlay.current) onClose();
    };

    return (
        <div
            className={"yearEditDayPopup"}
            onPointerDown={() => { pointerDownOnOverlay.current = true; }}
            onClick={handleTargetOverlayClick}
        >
            <div
                className={"yearEditDayContent"}
                onPointerDown={(e) => { e.stopPropagation(); pointerDownOnOverlay.current = false; }}
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: 280 }}
            >
                <h3 style={{ marginTop: 0 }}>Annual target</h3>
                <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
                    <label htmlFor={"yearTargetHours"}>Hours per year</label>
                    <input
                        id={"yearTargetHours"}
                        type={"number"}
                        min={0}
                        step={1}
                        value={hoursInput}
                        onChange={handleHoursChange}
                    />
                    <label htmlFor={"yearTargetPct"}>% of 2080</label>
                    <input
                        id={"yearTargetPct"}
                        type={"number"}
                        min={0}
                        max={100}
                        step={1}
                        value={pctInput}
                        onChange={handlePctChange}
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
