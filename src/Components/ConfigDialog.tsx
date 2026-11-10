import React, {useState, useEffect, useCallback, useRef} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import {useAppContext} from "../Utilities/AppContext";
import {calendarDb, START_OF_YEAR_MONTH_KEY} from "../Utilities/calendarDb";
import {TogglApiVersion} from "../Utilities/useTogglApiKey";
import {downloadDataExport, importDataExport, parseDataExport} from "../Utilities/dataTransfer";
import "./ConfigDialog.css";

const API_VERSIONS: {value: TogglApiVersion; label: string; tokenUrl: string; tokenHint: string}[] = [
    {value: "v1", label: "v1 — Toggl Track", tokenUrl: "https://track.toggl.com/profile", tokenHint: "track.toggl.com/profile"},
    {value: "v2", label: "v2 — Toggl 2.0", tokenUrl: "https://focus.toggl.com", tokenHint: "your Toggl 2.0 settings (API keys)"},
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface ConfigDialogProps {
    open: boolean;
    onClose: () => void;
}

export const ConfigDialog = ({open, onClose}: ConfigDialogProps) => {
    const {apiToken, setApiToken, apiVersion, setApiVersion, workspaces, selectedWorkspaceId, selectWorkspace, refetchUser} = useAppContext();
    const [localToken, setLocalToken] = useState(apiToken);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (open) setLocalToken(apiToken);
    }, [open, apiToken]);

    const applyToken = useCallback((token: string) => {
        setLocalToken(token);
        setApiToken(token);
    }, [setApiToken]);

    const fetchWorkspaces = useCallback(() => {
        if (!apiToken) return;
        setFetching(true);
        refetchUser();
        setTimeout(() => setFetching(false), 1500);
    }, [apiToken, refetchUser]);

    const handleSelectWorkspace = useCallback((id: number) => {
        selectWorkspace(id);
        onClose();
    }, [selectWorkspace, onClose]);

    const startOfYearSetting = useLiveQuery(
        async () => calendarDb.settings.get(START_OF_YEAR_MONTH_KEY),
        [open],
        undefined
    );
    const startOfYearMonth = Math.min(12, Math.max(1, (startOfYearSetting?.value ?? 1) as number));
    const setStartOfYearMonth = useCallback(async (month: number) => {
        await calendarDb.settings.put({
            key: START_OF_YEAR_MONTH_KEY,
            value: Math.min(12, Math.max(1, month)),
            updatedAt: Date.now()
        });
    }, []);

    const importInputRef = useRef<HTMLInputElement>(null);
    const [transferBusy, setTransferBusy] = useState(false);
    const [transferStatus, setTransferStatus] = useState<{error: boolean; text: string} | null>(null);

    useEffect(() => {
        if (open) setTransferStatus(null);
    }, [open]);

    const handleExport = useCallback(async () => {
        setTransferBusy(true);
        setTransferStatus(null);
        try {
            const rowCount = await downloadDataExport(apiToken);
            setTransferStatus({error: false, text: `Exported ${rowCount.toLocaleString()} records.`});
        } catch (e) {
            setTransferStatus({error: true, text: `Export failed: ${e instanceof Error ? e.message : String(e)}`});
        } finally {
            setTransferBusy(false);
        }
    }, [apiToken]);

    const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setTransferBusy(true);
        setTransferStatus(null);
        try {
            const data = parseDataExport(await file.text());
            const rowCount = Object.values(data.tables).reduce((sum, rows) => sum + rows.length, 0);
            const exportedAt = new Date(data.exportedAt);
            const when = Number.isNaN(exportedAt.getTime()) ? "an unknown date" : exportedAt.toLocaleString();
            const confirmed = window.confirm(
                `Import ${rowCount.toLocaleString()} records exported on ${when}?\n\n` +
                "This replaces ALL data currently stored in this browser, including the API token and settings."
            );
            if (!confirmed) return;
            const summary = await importDataExport(data);
            setTransferStatus({error: false, text: `Imported ${summary.rowCount.toLocaleString()} records. Reloading…`});
            // Reload so the in-memory API key, workspace and display settings come from the imported data.
            setTimeout(() => window.location.reload(), 600);
        } catch (err) {
            setTransferStatus({error: true, text: `Import failed: ${err instanceof Error ? err.message : String(err)}`});
        } finally {
            setTransferBusy(false);
        }
    }, []);

    if (!open) return null;

    const versionInfo = API_VERSIONS.find(v => v.value === apiVersion) ?? API_VERSIONS[0];

    return (
        <div className={"configOverlay"} onClick={onClose}>
            <div className={"configDialog"} onClick={e => e.stopPropagation()}>
                <div className={"configDialogHeader"}>
                    <h3>Configuration</h3>
                    <button className={"configCloseButton"} onClick={onClose} type={"button"}>&times;</button>
                </div>

                <label className={"configLabel"} htmlFor={"configApiVersion"}>Toggl API Version</label>
                <select
                    id={"configApiVersion"}
                    className={"configSelect"}
                    value={apiVersion}
                    onChange={e => setApiVersion(e.target.value as TogglApiVersion)}
                >
                    {API_VERSIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                </select>

                <label className={"configLabel"} htmlFor={"configApiToken"} style={{marginTop: 18}}>Toggl API Token</label>
                <div className={"configTokenRow"}>
                    <input
                        id={"configApiToken"}
                        className={"configInput"}
                        type={"password"}
                        placeholder={"Paste your API token here..."}
                        value={localToken}
                        onChange={e => applyToken(e.currentTarget.value)}
                    />
                    <button
                        className={"configButton"}
                        onClick={fetchWorkspaces}
                        disabled={!apiToken || fetching}
                    >
                        {fetching ? "Fetching..." : "Fetch"}
                    </button>
                </div>
                <small className={"configHint"}>
                    Find your {apiVersion} token at <a href={versionInfo.tokenUrl} target={"_blank"} rel={"noopener noreferrer"}>{versionInfo.tokenHint}</a>
                </small>

                <label className={"configLabel"} style={{marginTop: 18}}>Workspace</label>
                {workspaces.length ? (
                    <div className={"configWorkspaceList"}>
                        {workspaces.map(ws => (
                            <button
                                key={ws.id}
                                className={`configWorkspaceItem ${selectedWorkspaceId === ws.id ? "selected" : ""}`}
                                onClick={() => handleSelectWorkspace(ws.id)}
                            >
                                {ws.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className={"configEmpty"}>No workspaces loaded. Enter your API token and click Fetch.</p>
                )}

                <label className={"configLabel"} style={{marginTop: 18}}>Start of Year (fiscal)</label>
                <select
                    className={"configSelect"}
                    value={startOfYearMonth}
                    onChange={e => void setStartOfYearMonth(Number(e.target.value))}
                    aria-label={"First month of fiscal year"}
                >
                    {MONTH_NAMES.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                    ))}
                </select>

                <label className={"configLabel"} style={{marginTop: 18}}>Export / Import Data</label>
                <div className={"configTransferRow"}>
                    <button
                        className={"configButton"}
                        type={"button"}
                        onClick={() => void handleExport()}
                        disabled={transferBusy}
                    >
                        Export all data
                    </button>
                    <button
                        className={"configButton configButtonSecondary"}
                        type={"button"}
                        onClick={() => importInputRef.current?.click()}
                        disabled={transferBusy}
                    >
                        Import from file…
                    </button>
                    <input
                        ref={importInputRef}
                        type={"file"}
                        accept={"application/json,.json"}
                        style={{display: "none"}}
                        onChange={e => void handleImportFile(e)}
                        aria-label={"Import data file"}
                    />
                </div>
                <small className={"configHint"}>
                    Moves everything to another computer: time entries, projects, projections, notes, targets,
                    settings and your API token. The file contains your API token, so keep it private.
                    Importing replaces all data in this browser.
                </small>
                {transferStatus && (
                    <p className={`configTransferStatus ${transferStatus.error ? "error" : ""}`} role={"status"}>
                        {transferStatus.text}
                    </p>
                )}
            </div>
        </div>
    );
};
