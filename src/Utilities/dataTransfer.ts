import {calendarDb} from "./calendarDb";

const EXPORT_APP_ID = "toggl-calendar";
const EXPORT_FORMAT_VERSION = 1;

/** Every localStorage key the app uses (API credentials, selections and display preferences). */
const LOCAL_STORAGE_KEYS = [
    "togglApiKey",
    "togglApiToken",
    "togglApiVersion",
    "workSpaceId",
    "calendarDataMode",
    "calendarDarkMode",
    "weekTimeDisplayMode",
    "weekRowDisplayMode",
];

export interface IDataExport {
    app: typeof EXPORT_APP_ID;
    formatVersion: number;
    exportedAt: string;
    databaseVersion: number;
    localStorage: {[key: string]: string};
    tables: {[tableName: string]: unknown[]};
}

export interface IImportSummary {
    rowCount: number;
    tableCount: number;
    /** Tables in the file that this version of the app does not know about. */
    skippedTables: string[];
}

/**
 * Snapshot of everything the app stores: every Dexie table plus the localStorage settings.
 * `currentApiKey` covers a key that is in use but was never written to localStorage.
 */
export async function buildDataExport(currentApiKey?: string): Promise<IDataExport> {
    const tables: {[tableName: string]: unknown[]} = {};
    await calendarDb.transaction("r", calendarDb.tables, async () => {
        for (const table of calendarDb.tables) {
            tables[table.name] = await table.toArray();
        }
    });

    const storage: {[key: string]: string} = {};
    LOCAL_STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value != null) storage[key] = value;
    });
    if (currentApiKey && !storage.togglApiKey) {
        storage.togglApiKey = currentApiKey;
        storage.togglApiToken = currentApiKey;
    }

    return {
        app: EXPORT_APP_ID,
        formatVersion: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        databaseVersion: calendarDb.verno,
        localStorage: storage,
        tables,
    };
}

/** Build the export and download it as a JSON file. Returns the number of rows exported. */
export async function downloadDataExport(currentApiKey?: string): Promise<number> {
    const data = await buildDataExport(currentApiKey);
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timesheet-helper-export-${data.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Object.values(data.tables).reduce((sum, rows) => sum + rows.length, 0);
}

function isPlainObject(value: unknown): value is {[key: string]: unknown} {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse and validate the text of an export file. Throws a readable Error when it is not one. */
export function parseDataExport(text: string): IDataExport {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("This file is not valid JSON.");
    }
    if (!isPlainObject(parsed) || parsed.app !== EXPORT_APP_ID || !isPlainObject(parsed.tables)) {
        throw new Error("This file is not a Timesheet Helper export.");
    }
    if (typeof parsed.formatVersion !== "number" || parsed.formatVersion > EXPORT_FORMAT_VERSION) {
        throw new Error("This export was made by a newer version of Timesheet Helper.");
    }
    if (typeof parsed.databaseVersion === "number" && parsed.databaseVersion > calendarDb.verno) {
        throw new Error("This export was made by a newer version of Timesheet Helper. Reload this page to update, then try again.");
    }
    Object.entries(parsed.tables).forEach(([name, rows]) => {
        if (!Array.isArray(rows) || rows.some(row => !isPlainObject(row))) {
            throw new Error(`The "${name}" table in this file is malformed.`);
        }
    });
    if (parsed.localStorage !== undefined && !isPlainObject(parsed.localStorage)) {
        throw new Error("The settings in this file are malformed.");
    }
    return {
        ...(parsed as unknown as IDataExport),
        localStorage: (parsed.localStorage ?? {}) as {[key: string]: string},
    };
}

/**
 * Replace everything stored locally with the contents of an export.
 * The database swap is a single transaction, so a failure leaves the existing data untouched.
 * The page must be reloaded afterwards so in-memory state picks up the imported settings.
 */
export async function importDataExport(data: IDataExport): Promise<IImportSummary> {
    const knownNames = new Set(calendarDb.tables.map(table => table.name));
    const skippedTables = Object.keys(data.tables).filter(name => !knownNames.has(name));
    let rowCount = 0;

    await calendarDb.transaction("rw", calendarDb.tables, async () => {
        for (const table of calendarDb.tables) {
            const rows = data.tables[table.name] ?? [];
            await table.clear();
            if (rows.length) await table.bulkPut(rows);
            rowCount += rows.length;
        }
    });

    LOCAL_STORAGE_KEYS.forEach(key => {
        const value = data.localStorage[key];
        if (typeof value === "string") localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    });

    return {rowCount, tableCount: calendarDb.tables.length, skippedTables};
}
