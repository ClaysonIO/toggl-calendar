import React, {useState} from "react";
import {Link} from "react-router-dom";
import {appState} from "../App";
import {GithubLogo} from "./GithubLogo";
import {ConfigDialog} from "./ConfigDialog";
import {observer} from "mobx-react";

export const Header = observer(() => {
    const [configOpen, setConfigOpen] = useState(false);

    return (
        <>
            <header>
                <Link to={'/calendar'}><h1>Toggl Calendar View</h1></Link>
                <div style={{flex: 1}}/>
                {appState.selectedWorkSpace ? (
                    <span style={{color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", marginRight: 8}}>
                        {appState.selectedWorkSpace.name}
                    </span>
                ) : null}
                <button
                    className={"menuButton"}
                    onClick={() => setConfigOpen(true)}
                    title={"Configuration"}
                    style={{fontSize: "1rem"}}
                >
                    &#9881; Config
                </button>
                <GithubLogo/>
            </header>
            <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)}/>
        </>
    );
});