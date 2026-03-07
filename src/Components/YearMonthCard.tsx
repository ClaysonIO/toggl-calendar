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
    onEditProjection
}: {
    monthStart: dayjs.Dayjs;
    fiscalYear: { start: dayjs.Dayjs; end: dayjs.Dayjs };
    viewMode: ViewMode;
    billableFilter: BillableFilter;
    projectionsByDate: Record<string, number>;
    actualByDay: Record<string, number>;
    byDayByProject: Record<string, Array<{ label: string; hours: number }>>;
    timeDisplayMode: TimeDisplayMode;
    onEditProjection?: (date: string, hours: number) => void;
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
                                const editable = viewMode === "projected" && inRange && onEditProjection != null;
                                const editDefaultHours = projectedVal > 0 ? projectedVal : 0;

                                const showGrey = viewMode === "projected" && projectionExplicitZero;
                                const showGreen = isPast && actualHours > 0;
                                const greenIntensity = showGreen ? Math.min(1, actualHours / 8) : 0;

                                const dayProjectLines = actualHours > 0 && byDayByProject[key]?.length
                                    ? byDayByProject[key]
                                        .map(({ label, hours }) => `${label}: ${formatHours(hours, timeDisplayMode)}`)
                                        .join("\n")
                                    : null;
                                const dayTitle =
                                    dayProjectLines != null
                                        ? `${key}\n${dayProjectLines}${editable ? "\nClick to set hours" : ""}`
                                        : editable
                                            ? "Click to set hours"
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
                                            isToday ? "today" : ""
                                        ].filter(Boolean).join(" ")}
                                        data-billable-mode={showGreen ? billableFilter : undefined}
                                        style={showGreen ? { ["--actual-intensity" as string]: greenIntensity } as React.CSSProperties : undefined}
                                        onClick={editable ? () => onEditProjection!(key, editDefaultHours) : undefined}
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
