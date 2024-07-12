import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {SettingsPage} from "./Pages/Settings";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";
import {MainPage} from "./Pages/Main";

export const appState = new AppState();

function App() {

    const hasWorkspaceId = !!localStorage.getItem('workSpaceId')

    return (
            <Routes>
                <Route path={'/settings'} element={<SettingsPage/>}/>
                <Route path={'/calendar'} element={<CalendarPage/>}/>
                <Route path={'/main'} element={<MainPage/>}/>

                <Route path={"*"} element={hasWorkspaceId  ? <Navigate to={'/calendar'}/> : <Navigate to={'/main'}/>}/>
            </Routes>
    );
}

export default App;
