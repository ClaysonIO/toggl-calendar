import React from "react";
import {Link} from "react-router-dom";
import {WorkSpaceSelect} from "./WorkSpaceSelect";
import {appState} from "../App";
import {GithubLogo} from "./GithubLogo";

export const Header = ()=>{
    return (
        <header>
            <Link to={'/'}><h1>Toggl Calendar View</h1></Link>
            <div style={{flex: 1}}/>
            <WorkSpaceSelect/>
            {appState.workSpaces.length ? <Link to={'/?page=calendar'} >Calendar</Link> : ""}
            <Link to={'/?page=settings'} >Settings</Link>
            <GithubLogo/>
        </header>
    )
}