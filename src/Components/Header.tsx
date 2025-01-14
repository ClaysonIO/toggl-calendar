import React from "react";
import {Link} from "react-router-dom";
import {WorkSpaceSelect} from "./WorkSpaceSelect";
import {appState} from "../App";
import {GithubLogo} from "./GithubLogo";
import dayjs from "dayjs";

export const Header = ()=>{
    return (
        <header>
            <Link to={'/main'}><h1>Toggl Calendar View</h1></Link>
            <div style={{flex: 1}}/>
            <WorkSpaceSelect/>
            <Link to={`/projects/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`}>Projects</Link>
            {appState.workSpaces.length ? <Link to={'/calendar'} >Calendar</Link> : ""}
            <Link to={'/settings'} >Settings</Link>
            <GithubLogo/>
        </header>
    )
}