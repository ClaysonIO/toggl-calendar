import React, {useState, useEffect, useCallback} from "react";
import {useLiveQuery} from "dexie-react-hooks";
import {useAppContext} from "../Utilities/AppContext";
import {calendarDb, START_OF_YEAR_MONTH_KEY} from "../Utilities/calendarDb";
import "./ConfigDialog.css";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface ConfigDialogProps {
    open: boolean;
    onClose: () => void;
}

export const ConfigDialog = ({open, onClose}: ConfigDialogProps) => {
    const {apiToken, setApiToken, workspaces, selectedWorkspaceId, selectWorkspace, refetchUser} = useAppContext();
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

    return (
        <div className={"configOverlay"} onClick={onClose}>
            <div className={"configDialog"} onClick={e => e.stopPropagation()}>
                <div className={"configDialogHeader"}>
                    <h3>Configuration</h3>
                    <button className={"configCloseButton"} onClick={onClose} type={"button"}>&times;</button>
                </div>

                <label className={"configLabel"} htmlFor={"configApiToken"}>Toggl API Token</label>
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
                    Find your token at <a href={"https://toggl.com/app/profile"} target={"_blank"} rel={"noopener noreferrer"}>toggl.com/app/profile</a>
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
