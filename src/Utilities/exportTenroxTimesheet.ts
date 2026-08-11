import ExcelJS from "exceljs";
import dayjs from "dayjs";
import {IProjectTenroxId} from "./calendarDb";

export interface ITenroxExportRow {
    projectId: number;
    projectName: string;
    dailyHours: {[date: string]: number};
    dailyTaskDescriptions: {[date: string]: string[]};
}

/** Same quarter-hour rounding as the table's "rounded" display mode. */
const roundToQuarterHour = (hours: number) => {
    if (hours <= 0) return 0;
    return (Math.round(hours / 0.25) * 0.25) || 0.25;
};

const columnLetter = (columnNumber: number) => {
    let letters = "";
    let remaining = columnNumber;
    while (remaining > 0) {
        const modulo = (remaining - 1) % 26;
        letters = String.fromCharCode(65 + modulo) + letters;
        remaining = Math.floor((remaining - 1) / 26);
    }
    return letters;
};

const addSheet = (
    workbook: ExcelJS.Workbook,
    name: string,
    rows: {row: ITenroxExportRow; tenrox?: IProjectTenroxId}[],
    dateKeys: string[]
) => {
    const sheet = workbook.addWorksheet(name);

    const columns: Partial<ExcelJS.Column>[] = [{width: 38}, {width: 42}, {width: 24}, {width: 13}];
    dateKeys.forEach(() => columns.push({width: 12}, {width: 30}));
    columns.push({width: 10});
    sheet.columns = columns;

    const headerValues: string[] = ["Project", "Task", "Charge", "Assignment ID"];
    dateKeys.forEach(date => {
        const dayLabel = dayjs(date).format("ddd YYYY-MM-DD");
        headerValues.push(dayLabel, `${dayLabel} Note`);
    });
    headerValues.push("Total");
    sheet.addRow(headerValues).font = {bold: true};

    const hourColumnNumber = (dayIndex: number) => 5 + dayIndex * 2;
    const totalColumnNumber = 5 + dateKeys.length * 2;
    const hourColumnLetters = dateKeys.map((_, dayIndex) => columnLetter(hourColumnNumber(dayIndex)));
    const totalColumnLetter = columnLetter(totalColumnNumber);

    rows.forEach(({row, tenrox}) => {
        const excelRow = sheet.addRow([]);
        const rowNumber = excelRow.number;
        excelRow.getCell(1).value = tenrox?.project?.trim() || row.projectName;
        if (tenrox?.task?.trim()) excelRow.getCell(2).value = tenrox.task.trim();
        if (tenrox?.charge?.trim()) excelRow.getCell(3).value = tenrox.charge.trim();
        if (tenrox?.assignmentId?.trim()) excelRow.getCell(4).value = tenrox.assignmentId.trim();
        dateKeys.forEach((date, dayIndex) => {
            const hours = roundToQuarterHour(row.dailyHours[date] || 0);
            if (hours > 0) excelRow.getCell(hourColumnNumber(dayIndex)).value = hours;
            const descriptions = Array.from(new Set(row.dailyTaskDescriptions[date] || [])).join("; ");
            if (descriptions) excelRow.getCell(hourColumnNumber(dayIndex) + 1).value = descriptions;
        });
        excelRow.getCell(totalColumnNumber).value = {
            formula: hourColumnLetters.map(letter => `${letter}${rowNumber}`).join("+")
        };
    });

    if (rows.length > 0) {
        const firstDataRow = 2;
        const lastDataRow = rows.length + 1;
        const totalRow = sheet.addRow([]);
        totalRow.getCell(1).value = "TOTAL";
        hourColumnLetters.forEach((letter, dayIndex) => {
            totalRow.getCell(hourColumnNumber(dayIndex)).value = {
                formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`
            };
        });
        totalRow.getCell(totalColumnNumber).value = {
            formula: `SUM(${totalColumnLetter}${firstDataRow}:${totalColumnLetter}${lastDataRow})`
        };
    }
};

/**
 * Builds a Tenrox timesheet workbook (matching docs/tenrox-timesheet-*.xlsx) and
 * triggers a browser download. Rows whose Tenrox "Charge" field is set go on the
 * Adjustment sheet; all others go on the Assignment sheet.
 */
export const exportTenroxTimesheet = async (
    rows: ITenroxExportRow[],
    tenroxIdsByProjectId: {[projectId: number]: IProjectTenroxId},
    dateKeys: string[],
    weekStartKey: string,
    weekEndKey: string
) => {
    const workbook = new ExcelJS.Workbook();

    const withTenrox = rows.map(row => ({row, tenrox: tenroxIdsByProjectId[row.projectId]}));
    const assignmentRows = withTenrox.filter(({tenrox}) => !tenrox?.charge?.trim());
    const adjustmentRows = withTenrox.filter(({tenrox}) => !!tenrox?.charge?.trim());

    addSheet(workbook, "Assignment", assignmentRows, dateKeys);
    addSheet(workbook, "Adjustment", adjustmentRows, dateKeys);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tenrox-timesheet-${weekStartKey}_to_${weekEndKey}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
};
