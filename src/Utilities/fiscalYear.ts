import dayjs, {Dayjs} from "dayjs";

/**
 * Return the fiscal year that contains the given date.
 * startMonth 1 = January (calendar year); startMonth 4 = April (e.g. FY runs Apr–Mar).
 * The label is the ending year (e.g. FY27 for the period ending in 2027).
 */
export function getFiscalYearBounds(
    date: Dayjs,
    startMonth: number
): { start: Dayjs; end: Dayjs; startKey: string; endKey: string; label: string } {
    const month = date.month() + 1; // 1-12
    const year = date.year();
    const fyStartYear = month >= startMonth ? year : year - 1;
    const start = dayjs(`${fyStartYear}-${String(startMonth).padStart(2, "0")}-01`);
    const end = start.add(1, "year").subtract(1, "day");
    return {
        start,
        end,
        startKey: start.format("YYYY-MM-DD"),
        endKey: end.format("YYYY-MM-DD"),
        label: String(end.year())
    };
}

/** List of 12 month start dates (YYYY-MM-01) for the given fiscal year. */
export function getFiscalYearMonthStarts(
    fyStart: Dayjs,
    fyEnd: Dayjs
): Dayjs[] {
    const months: Dayjs[] = [];
    let m = fyStart.startOf("month");
    while (m.isBefore(fyEnd) || m.isSame(fyEnd, "month")) {
        months.push(m);
        m = m.add(1, "month");
    }
    return months;
}
