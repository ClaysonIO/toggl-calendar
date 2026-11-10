import React, {useRef, useState} from "react";
import dayjs from "dayjs";

const WORKING_DAY_HOURS = 8;

/** Edit projected hours for one day, or for every day in `dates` at once. */
export function YearEditDayDialog({
    dates,
    hours,
    onClose
}: {
    /** Days to update, in ascending order. */
    dates: string[];
    hours: number;
    onClose: (confirmed: boolean, newHours?: number) => void;
}) {
    const [value, setValue] = useState(() => String(hours));
    const pointerDownOnOverlay = useRef(false);
    const handleSubmit = () => {
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        onClose(true, safe);
    };
    const parsedValue = Number(value);
    const isNotWorking = value.trim() !== "" && parsedValue === 0;
    const isWorkingDay = parsedValue === WORKING_DAY_HOURS;
    const handleOverlayClick = () => {
        if (pointerDownOnOverlay.current) onClose(false);
    };
    const first = dayjs(dates[0]);
    const last = dayjs(dates[dates.length - 1]);
    const label = dates.length === 1
        ? `Hours for ${first.format("MMM D, YYYY")}`
        : `Hours per day for ${first.format(first.year() === last.year() ? "MMM D" : "MMM D, YYYY")} – ${last.format("MMM D, YYYY")} (${dates.length} weekdays)`;
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
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <label htmlFor={"yearEditDayInput"}>{label}</label>
                    <input
                        id={"yearEditDayInput"}
                        type={"number"}
                        autoFocus
                        onFocus={(e) => e.currentTarget.select()}
                        min={0}
                        step={0.25}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") onClose(false); }}
                    />
                    <div className={"yearEditDayQuick"} role={"group"} aria-label={"Day type"}>
                        <button
                            type={"button"}
                            className={isWorkingDay ? "selected" : ""}
                            aria-pressed={isWorkingDay}
                            onClick={() => onClose(true, WORKING_DAY_HOURS)}
                            title={`Set to a normal ${WORKING_DAY_HOURS}-hour working day`}
                        >
                            Working ({WORKING_DAY_HOURS}h)
                        </button>
                        <button
                            type={"button"}
                            className={isNotWorking ? "selected" : ""}
                            aria-pressed={isNotWorking}
                            onClick={() => onClose(true, 0)}
                            title={"Set to 0 hours (holiday / day off)"}
                        >
                            Not working
                        </button>
                    </div>
                    <div className={"yearEditDayActions"}>
                        <button type={"button"} onClick={() => onClose(false)}>Cancel</button>
                        <button type={"submit"} className={"primary"}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
