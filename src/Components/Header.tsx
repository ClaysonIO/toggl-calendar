import React from "react";
import {Link} from "react-router-dom";
import {WorkSpaceSelect} from "./WorkSpaceSelect";
import {appState} from "../App";

export const Header = ()=>{
    return (
        <header>
            <Link to={'/'}><h1>Toggl Calendar View</h1></Link>
            <div style={{flex: 1}}/>
            <WorkSpaceSelect/>
            {appState.workSpaces.length ? <Link to={'/calendar'} >Calendar</Link> : ""}
            <Link to={'/settings'} >Settings</Link>
            <a title={"https://github.com/ClaysonIO/toggl-calendar"} href="https://github.com/ClaysonIO/toggl-calendar" style={{margin: "0"}}><img
                width="120"
                height="120"
                src="https://github.blog/wp-content/uploads/2008/12/forkme_right_green_007200.png?resize=120%2C120"
                alt="Fork me on GitHub"
                data-recalc-dims="1"
            /></a>
        </header>
    )
}