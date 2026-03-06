import React, {useCallback, useEffect, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {useAppContext} from "../Utilities/AppContext";
import {GithubLogo} from "./GithubLogo";
import {ConfigDialog} from "./ConfigDialog";

const DARK_MODE_STORAGE_KEY = "calendarDarkMode";

const loadDarkMode = (): boolean => {
    try {
        return localStorage.getItem(DARK_MODE_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

const applyTheme = (dark: boolean) => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
};

applyTheme(loadDarkMode());

export const Header = () => {
    const {selectedWorkspace} = useAppContext();
    const [configOpen, setConfigOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(loadDarkMode);
    const location = useLocation();

    useEffect(() => {
        applyTheme(darkMode);
        localStorage.setItem(DARK_MODE_STORAGE_KEY, darkMode ? "true" : "false");
    }, [darkMode]);

    const toggleDark = useCallback(() => setDarkMode(prev => !prev), []);

    return (
        <>
            <header>
                <Link to={'/week'}><h1>Toggl Calendar View</h1></Link>
                <nav className={"headerNav"}>
                    <Link to={'/week'} className={location.pathname === '/week' ? 'headerNavActive' : ''}>Week</Link>
                    <Link to={'/year'} className={location.pathname === '/year' ? 'headerNavActive' : ''}>Year</Link>
                </nav>
                <div style={{flex: 1}}/>
                {selectedWorkspace ? (
                    <span style={{color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", marginRight: 8}}>
                        {selectedWorkspace.name}
                    </span>
                ) : null}
                <button
                    className={"menuButton"}
                    onClick={toggleDark}
                    title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    style={{fontSize: "1rem"}}
                >
                    {darkMode ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
                </button>
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
};