import React, {useRef, useState} from "react";
import dayjs from "dayjs";

export function YearEditDayDialog({
    date,
    hours,
    onClose
}: {
    date: string;
    hours: number;
    onClose: (confirmed: boolean, newHours?: number) => void;
}) {
    const [value, setValue] = useState(() => String(hours === 8 ? 0 : hours));
    const pointerDownOnOverlay = useRef(false);
    const handleSubmit = () => {
        const parsed = Number(value);
        const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        onClose(true, safe);
    };
    const handleOverlayClick = () => {
        if (pointerDownOnOverlay.current) onClose(false);
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
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <label htmlFor={"yearEditDayInput"}>Hours for {dayjs(date).format("MMM D, YYYY")}</label>
                    <input
                        id={"yearEditDayInput"}
                        type={"number"}
                        min={0}
                        step={0.25}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") onClose(false); }}
                    />
                    <div className={"yearEditDayActions"}>
                        <button type={"button"} onClick={() => onClose(false)}>Cancel</button>
                        <button type={"submit"} className={"primary"}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
