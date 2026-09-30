import React, {useRef, useState} from "react";
import {calendarDb, ANNUAL_TARGET_HOURS_KEY, ANNUAL_TARGET_PERCENTAGE_KEY, FULL_TIME_HOURS_KEY} from "../Utilities/calendarDb";

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, n));

export function YearEditTargetDialog({
    annualTargetHours,
    annualTargetPct,
    fullTimeHours,
    onClose
}: {
    annualTargetHours: number;
    annualTargetPct?: number;
    fullTimeHours: number;
    onClose: () => void;
}) {
    const [hoursInput, setHoursInput] = useState(String(round2(annualTargetHours)));
    const [fullTimeHoursInput, setFullTimeHoursInput] = useState(String(fullTimeHours));
    const [pctInput, setPctInput] = useState(
        String(round2(annualTargetPct ?? (annualTargetHours / fullTimeHours) * 100))
    );
    /** Which field the user edited last; that value is saved exactly and the other is derived from it. */
    const [lastEdited, setLastEdited] = useState<"hours" | "pct">("hours");
    const pointerDownOnOverlay = useRef(false);

    const parseFullTime = (raw: string) => {
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : fullTimeHours;
    };
    const fullTimeHoursNum = parseFullTime(fullTimeHoursInput);

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setHoursInput(raw);
        setLastEdited("hours");
        const parsed = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0) {
            setPctInput(String(round2(clampPct((parsed / fullTimeHoursNum) * 100))));
        }
    };
    const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setPctInput(raw);
        setLastEdited("pct");
        const parsed = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
            setHoursInput(String(round2((parsed / 100) * fullTimeHoursNum)));
        }
    };
    const handleFullTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setFullTimeHoursInput(raw);
        const fullTime = parseFullTime(raw);
        // Keep whichever value the user set last fixed, and re-derive the other
        if (lastEdited === "pct") {
            const pct = Number(pctInput);
            if (Number.isFinite(pct)) setHoursInput(String(round2((pct / 100) * fullTime)));
        } else {
            const hours = Number(hoursInput);
            if (Number.isFinite(hours)) setPctInput(String(round2(clampPct((hours / fullTime) * 100))));
        }
    };

    const handleSave = async () => {
        const hours = Number(hoursInput);
        const pct = Number(pctInput);
        const now = Date.now();
        const effectiveFullTime = Math.round(fullTimeHoursNum);
        let savedHours: number | null = null;
        let savedPct: number | null = null;
        if (lastEdited === "pct" && pctInput.trim() !== "" && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
            savedPct = round2(pct);
            savedHours = round2((savedPct / 100) * effectiveFullTime);
        } else if (hoursInput.trim() !== "" && Number.isFinite(hours) && hours >= 0) {
            savedHours = round2(Math.min(hours, effectiveFullTime));
            // Store the unrounded percentage so the year page resolves back to exactly these hours
            savedPct = clampPct((savedHours / effectiveFullTime) * 100);
        }
        await calendarDb.settings.put({
            key: FULL_TIME_HOURS_KEY,
            value: effectiveFullTime,
            updatedAt: now
        });
        if (savedHours != null && savedPct != null) {
            await calendarDb.settings.put({key: ANNUAL_TARGET_HOURS_KEY, value: savedHours, updatedAt: now});
            await calendarDb.settings.put({key: ANNUAL_TARGET_PERCENTAGE_KEY, value: savedPct, updatedAt: now});
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
                    <label htmlFor={"yearFullTimeHours"}>Full-time hours per year</label>
                    <input
                        id={"yearFullTimeHours"}
                        type={"number"}
                        min={1}
                        step={1}
                        value={fullTimeHoursInput}
                        onChange={handleFullTimeChange}
                        title={"Reference for percentage (e.g. 2080 or 2060)"}
                    />
                    <label htmlFor={"yearTargetHours"}>Hours per year</label>
                    <input
                        id={"yearTargetHours"}
                        type={"number"}
                        min={0}
                        step={0.01}
                        value={hoursInput}
                        onChange={handleHoursChange}
                    />
                    <label htmlFor={"yearTargetPct"}>% of full-time</label>
                    <input
                        id={"yearTargetPct"}
                        type={"number"}
                        min={0}
                        max={100}
                        step={0.01}
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
