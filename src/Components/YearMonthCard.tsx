import React from "react";
import dayjs from "dayjs";
import type {BillableFilter} from "../Utilities/togglDetailsFromDexie";
import {
    formatHours,
    formatHoursDisplay,
    ViewMode,
    TimeDisplayMode,
    WEEKDAY_LABELS
} from "../Utilities/yearViewUtils";

export function YearMonthCard({
    monthStart,
    fiscalYear,
    viewMode,
    billableFilter,
    projectionsByDate,
    actualByDay,
    byDayByProject,
    timeDisplayMode,
    selectedRange,
    onDayClick,
    onDayPointerDown,
    onDayPointerEnter
}: {
    monthStart: dayjs.Dayjs;
    fiscalYear: { start: dayjs.Dayjs; end: dayjs.Dayjs };
    viewMode: ViewMode;
    billableFilter: BillableFilter;
    projectionsByDate: Record<string, number>;
    actualByDay: Record<string, number>;
    byDayByProject: Record<string, Array<{ label: string; hours: number }>>;
    timeDisplayMode: TimeDisplayMode;
    /** Inclusive date range currently highlighted by a click-and-drag selection. */
    selectedRange?: { start: string; end: string } | null;
    /** Plain click on a day (used where days are edited one at a time). */
    onDayClick?: (date: string) => void;
    /** Mouse pressed on an editable day: starts a selection (a plain click selects just that day). */
    onDayPointerDown?: (date: string) => void;
    /** Mouse moved onto an editable day; extends a selection in progress. */
    onDayPointerEnter?: (date: string) => void;
}) {
    const monthEnd = monthStart.endOf("month");
    const calendarStart = monthStart.startOf("week");
    const calendarEnd = monthEnd.endOf("week");
    const days: { date: dayjs.Dayjs; isThisMonth: boolean }[] = [];
    let d = calendarStart;
    while (d.isBefore(calendarEnd) || d.isSame(calendarEnd, "day")) {
        days.push({
            date: d,
            isThisMonth: d.month() === monthStart.month()
        });
        d = d.add(1, "day");
    }
    const todayKey = dayjs().format("YYYY-MM-DD");
    const rowCount = Math.ceil(days.length / 7);

    return (
        <div className={"yearMonthCard"}>
            <div className={"yearMonthTitle"}>{monthStart.format("MMMM YYYY")}</div>
            <div className={"yearMonthGrid"}>
                {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className={"yearMonthWeekday"}>{label}</div>
                ))}
                <div className={"yearMonthWeekday yearWeekTotalHeader"}>Total</div>
                {Array.from({ length: rowCount }, (_, rowIndex) => {
                    const rowDays = days.slice(rowIndex * 7, rowIndex * 7 + 7);
                    const weekTotal = rowDays.reduce(
                        (sum, { date }) => sum + (actualByDay[date.format("YYYY-MM-DD")] ?? 0),
                        0
                    );
                    return (
                        <React.Fragment key={rowIndex}>
                            {rowDays.map(({ date, isThisMonth }) => {
                                const key = date.format("YYYY-MM-DD");
                                const inRange = (date.isAfter(fiscalYear.start) || date.isSame(fiscalYear.start, "day")) &&
                                    (date.isBefore(fiscalYear.end) || date.isSame(fiscalYear.end, "day"));
                                const isWeekday = date.day() !== 0 && date.day() !== 6;
                                const projectedVal = isWeekday
                                    ? (projectionsByDate[key] ?? 8)
                                    : 0;
                                const projectionExplicitZero = projectedVal === 0;
                                const actualHours = actualByDay[key] ?? 0;
                                const hours = viewMode === "projected" ? projectedVal : actualHours;
                                const isToday = key === todayKey;
                                const isPast = key < todayKey;
                                const editable = inRange && (onDayPointerDown != null || onDayClick != null);
                                // Weekends are skipped by multi-day selections, so only highlight them when clicked on their own.
                                const isSelected = editable && selectedRange != null && key >= selectedRange.start && key <= selectedRange.end
                                    && (date.day() !== 0 && date.day() !== 6 || selectedRange.start === selectedRange.end);

                                const showGrey = viewMode === "projected" && projectionExplicitZero;
                                const showGreen = isPast && actualHours > 0;
                                const greenIntensity = showGreen ? Math.min(1, actualHours / 8) : 0;

                                const dayProjectLines = actualHours > 0 && byDayByProject[key]?.length
                                    ? byDayByProject[key]
                                        .map(({ label, hours }) => `${label}: ${formatHours(hours, timeDisplayMode)}`)
                                        .join("\n")
                                    : null;
                                const editHint = onDayPointerDown != null
                                    ? "Click to set hours, or drag to select several days"
                                    : "Click to set hours";
                                const dayTitle =
                                    dayProjectLines != null
                                        ? `${key}\n${dayProjectLines}${editable ? `\n${editHint}` : ""}`
                                        : editable
                                            ? editHint
                                            : `${key}: ${hours > 0 ? formatHours(hours, timeDisplayMode) : "0"}`;

                                return (
                                    <div
                                        key={key}
                                        className={[
                                            "yearDayCell",
                                            !isThisMonth ? "otherMonth" : "",
                                            showGrey ? "zeroHours" : "",
                                            showGreen ? "hasActual" : "",
                                            editable ? "editable" : "",
                                            isToday ? "today" : "",
                                            isSelected ? "selected" : ""
                                        ].filter(Boolean).join(" ")}
                                        data-billable-mode={showGreen ? billableFilter : undefined}
                                        style={showGreen ? { ["--actual-intensity" as string]: greenIntensity } as React.CSSProperties : undefined}
                                        onClick={editable && onDayClick ? () => onDayClick(key) : undefined}
                                        onMouseDown={editable && onDayPointerDown ? (e) => {
                                            if (e.button !== 0) return;
                                            e.preventDefault();
                                            onDayPointerDown(key);
                                        } : undefined}
                                        onMouseEnter={editable && onDayPointerEnter ? () => onDayPointerEnter(key) : undefined}
                                        title={dayTitle}
                                    >
                                        <span className={"yearDayNum"}>{date.date()}</span>
                                        {isThisMonth && inRange && hours > 0 && hours !== 8 && (
                                            <span className={"yearDayHours yearHoursBadge"}>{formatHoursDisplay(hours, timeDisplayMode)}</span>
                                        )}
                                    </div>
                                );
                            })}
                            <div key={`total-${rowIndex}`} className={"yearDayCell yearWeekTotalCell"} title={"Weekly worked hours"}>
                                {weekTotal > 0 ? formatHoursDisplay(weekTotal, timeDisplayMode) : ""}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
