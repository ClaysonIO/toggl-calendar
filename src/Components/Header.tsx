import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {useAppContext} from "../Utilities/AppContext";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import type {DataMode} from "../Utilities/AppContext";
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
    const {selectedWorkspace, dataMode, setDataMode} = useAppContext();
    const [configOpen, setConfigOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(loadDarkMode);
    const location = useLocation();

    useEffect(() => {
        applyTheme(darkMode);
        localStorage.setItem(DARK_MODE_STORAGE_KEY, darkMode ? "true" : "false");
    }, [darkMode]);

    const toggleDark = useCallback(() => setDarkMode(prev => !prev), []);
    const handleModeChange = useCallback((mode: DataMode) => setDataMode(mode), [setDataMode]);

    const yearSearch = useMemo(() => {
        if (location.pathname !== "/year" && location.pathname !== "/projects") return "";
        const params = splitQuery(location.search);
        const y = params.year;
        return y && /^\d{4}$/.test(y) ? `?year=${y}` : "";
    }, [location.pathname, location.search]);

    return (
        <>
            <header>
                <Link to={'/week'}><h1>Toggl Calendar View</h1></Link>
                <nav className={"headerNav"}>
                    <Link to={'/week'} className={location.pathname === '/week' ? 'headerNavActive' : ''}>Week</Link>
                    <Link to={`/year${yearSearch}`} className={location.pathname === '/year' ? 'headerNavActive' : ''}>Year</Link>
                    <Link to={`/projects${yearSearch}`} className={location.pathname === '/projects' ? 'headerNavActive' : ''}>Projects</Link>
                </nav>
                <div className={"headerModeToggle"}>
                    <button
                        className={`headerModeButton ${dataMode === "toggl" ? "active" : ""}`}
                        onClick={() => handleModeChange("toggl")}
                        type={"button"}
                    >
                        Toggl
                    </button>
                    <button
                        className={`headerModeButton ${dataMode === "manual" ? "active" : ""}`}
                        onClick={() => handleModeChange("manual")}
                        type={"button"}
                    >
                        Manual
                    </button>
                </div>
                <div style={{flex: 1}}/>
                {dataMode === "toggl" && selectedWorkspace ? (
                    <span style={{color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", marginRight: 8}}>
                        {selectedWorkspace.name}
                    </span>
                ) : dataMode === "manual" ? (
                    <span style={{color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", marginRight: 8, fontStyle: "italic"}}>
                        Manual Entry
                    </span>
                ) : null}
                <Link to={"/help"} className={"menuButton"} title={"Help"} style={{fontSize: "1rem", textDecoration: "none"}}>
                    &#10068; Help
                </Link>
                <button
                    className={"menuButton"}
                    onClick={toggleDark}
                    title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    style={{fontSize: "1rem"}}
                >
                    {darkMode ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
                </button>
                {dataMode === "toggl" && (
                    <button
                        className={"menuButton"}
                        onClick={() => setConfigOpen(true)}
                        title={"Configuration"}
                        style={{fontSize: "1rem"}}
                    >
                        &#9881; Config
                    </button>
                )}
                <GithubLogo/>
            </header>
            <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)}/>
        </>
    );
};