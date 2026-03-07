import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";

export type ViewMode = "projected" | "actual";
export type TimeDisplayMode = "rounded" | "actual";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_TIME_HOURS = 2080;

export const formatHours = (hours: number, mode: TimeDisplayMode) =>
    mode === "actual"
        ? `${Math.floor(hours)}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`
        : DecimalToRoundedTime(hours);

/** Like formatHours but drops trailing .00 for rounded mode (e.g. "8" not "8.00"). */
export const formatHoursDisplay = (hours: number, mode: TimeDisplayMode): string => {
    const s = formatHours(hours, mode);
    if (mode === "rounded" && s.endsWith(".00")) return s.slice(0, -3);
    return s;
};

/** Display format for project in dropdown: Company - Project Name */
export const projectLabel = (p: { name: string; client_name?: string }) =>
    (p.client_name ? `${p.client_name} - ${p.name}` : p.name);

export type ProjectOption = { id: number; name: string; client_name?: string };
