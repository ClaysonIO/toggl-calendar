import React from "react";
import {Layout} from "../Components/Layout";
import {Calendar} from "../Components/Calendar";
import {appState} from "../App";

export const CalendarPage = () =>{

    return (
        <Layout>
            <h2>Calendar</h2>

            {appState.selectedWorkSpace ? <Calendar workSpace={appState.selectedWorkSpace}/> : ""}
        </Layout>
    )
}