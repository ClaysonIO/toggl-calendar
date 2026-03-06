import React, {useState, useEffect, useCallback} from "react";
import {useAppContext} from "../Utilities/AppContext";
import "./ConfigDialog.css";

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
            </div>
        </div>
    );
};
