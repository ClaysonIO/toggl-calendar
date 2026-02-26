import React, {useState, useEffect, useCallback} from "react";
import {observer} from "mobx-react";
import {appState} from "../App";
import {WorkSpace} from "../Utilities/WorkSpace";
import {useTogglApiKey} from "../Utilities/useTogglApiKey";
import "./ConfigDialog.css";

interface ConfigDialogProps {
    open: boolean;
    onClose: () => void;
}

export const ConfigDialog = observer(({open, onClose}: ConfigDialogProps) => {
    const [apiToken, setApiToken] = useState(appState.settings.apiToken);
    const {setTogglApiKey} = useTogglApiKey();
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (open) setApiToken(appState.settings.apiToken);
    }, [open]);

    const applyToken = useCallback((token: string) => {
        appState.settings.setApiToken(token);
        setApiToken(token);
        localStorage.setItem("togglApiKey", token);
        setTogglApiKey(token);
    }, [setTogglApiKey]);

    const fetchWorkspaces = useCallback(() => {
        if (!appState.settings.apiToken) return;
        setFetching(true);
        appState.getWorkSpaces();
        setTimeout(() => setFetching(false), 1500);
    }, []);

    const selectWorkSpace = useCallback((ws: WorkSpace) => {
        appState.selectWorkSpace(ws);
        onClose();
    }, [onClose]);

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
                        value={apiToken}
                        onChange={e => applyToken(e.currentTarget.value)}
                    />
                    <button
                        className={"configButton"}
                        onClick={fetchWorkspaces}
                        disabled={!appState.settings.apiToken || fetching}
                    >
                        {fetching ? "Fetching..." : "Fetch"}
                    </button>
                </div>
                <small className={"configHint"}>
                    Find your token at <a href={"https://toggl.com/app/profile"} target={"_blank"} rel={"noopener noreferrer"}>toggl.com/app/profile</a>
                </small>

                <label className={"configLabel"} style={{marginTop: 18}}>Workspace</label>
                {appState.workSpaces.length ? (
                    <div className={"configWorkspaceList"}>
                        {appState.workSpaces.map(ws => (
                            <button
                                key={ws.id}
                                className={`configWorkspaceItem ${appState.selectedWorkSpace?.id === ws.id ? "selected" : ""}`}
                                onClick={() => selectWorkSpace(ws)}
                            >
                                {ws.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className={"configEmpty"}>No workspaces loaded. Enter your API token and click Fetch.</p>
                )}
            </div>
        </div>
    );
});
