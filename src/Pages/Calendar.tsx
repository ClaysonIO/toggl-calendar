import React from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {DraggableCalendar} from "../Components/DraggableCalendar";

export const CalendarPage = () =>{

    return (
        <Layout>
            <h2>Calendar</h2>

            {appState.selectedWorkSpace ? <DraggableCalendar workSpace={appState.selectedWorkSpace}/> : ""}
        </Layout>
    )
}