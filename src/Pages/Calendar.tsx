import React from "react";
import {Layout} from "../Components/Layout";
import {Calendar} from "../Components/Calendar";
import {appState} from "../App";
import {DraggableCalendar} from "../Components/DraggableCalendar";

export const CalendarPage = () =>{

    return (
        <Layout>
            <h2>Calendar</h2>

            {appState.selectedWorkSpace ? <DraggableCalendar workSpace={appState.selectedWorkSpace}/> : ""}
            <hr/>
            {appState.selectedWorkSpace ? <Calendar workSpace={appState.selectedWorkSpace}/> : ""}
        </Layout>
    )
}