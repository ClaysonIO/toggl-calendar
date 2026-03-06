import dayjs from "dayjs";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {ISingleProjectTasks} from "./Interfaces/ISingleProjectTasks";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";

/**
 * Reduce raw Toggl time entries into the simplified per-project, per-date structure
 * used by the Calendar (same logic as former useTogglDetails).
 */
export function rawEntriesToSimpleData(
    rawData: ITaskResponse[]
): { [key: number]: ISingleProjectTasks } | undefined {
    if (!rawData) return undefined;
    if (rawData.length === 0) return {};
    return rawData.reduce((acc: { [key: number]: ISingleProjectTasks }, val) => {
        if (!Number.isFinite(val?.pid)) return acc;

        if (!acc[val.pid]) {
            acc[val.pid] = {
                project_id: val.pid,
                project_name: val.project || undefined,
                client_name: val.client || undefined,
                project_hex_color: val.project_hex_color || undefined,
                dates: {}
            };
        }

        const projectSummary = acc[val.pid];
        if (!projectSummary.project_name && val.project) {
            projectSummary.project_name = val.project;
        }
        if (!projectSummary.client_name && val.client) {
            projectSummary.client_name = val.client;
        }
        if (!projectSummary.project_hex_color && val.project_hex_color) {
            projectSummary.project_hex_color = val.project_hex_color;
        }

        const entryDate = dayjs(val.start).format("YYYY-MM-DD");
        if (!projectSummary.dates[entryDate]) {
            projectSummary.dates[entryDate] = {
                date: entryDate,
                hours: 0,
                roundedHours: 0,
                taskDescriptions: new Set<string>()
            };
        }

        projectSummary.dates[entryDate].hours += val.dur / 1000 / 60 / 60;
        projectSummary.dates[entryDate].roundedHours = +DecimalToRoundedTime(
            projectSummary.dates[entryDate].hours
        );

        const descriptionChunks = (val.description || "")
            .split(",")
            .map((d: string) => d.trim())
            .filter((d: string) => !!d);
        descriptionChunks.forEach((description) => {
            projectSummary.dates[entryDate].taskDescriptions.add(description);
        });

        return acc;
    }, {});
}
