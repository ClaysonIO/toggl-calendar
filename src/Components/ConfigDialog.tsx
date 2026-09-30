import React, {useState, useEffect, useCallback} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import {useAppContext} from "../Utilities/AppContext";
import {calendarDb, START_OF_YEAR_MONTH_KEY} from "../Utilities/calendarDb";
import {TogglApiVersion} from "../Utilities/useTogglApiKey";
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
            </div>
        </div>
    );
};
