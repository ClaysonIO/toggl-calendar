import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {SettingsPage} from "./Pages/Settings";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";
import {MainPage} from "./Pages/Main";
import {ProjectsPage} from "./Pages/ProjectsPage";
import {TEST_TOGGL_API_KEY, TEST_TOGGL_WORKSPACE_NAME} from "./Utilities/testingEnv";

export const appState = new AppState();

function App() {

  const hasWorkspaceId = !!localStorage.getItem('workSpaceId') || (!!TEST_TOGGL_API_KEY && !!TEST_TOGGL_WORKSPACE_NAME)

    return (
            <Routes>
                <Route path={'/settings'} element={<SettingsPage/>}/>
                <Route path={'/calendar'} element={<CalendarPage/>}/>
                <Route path={'/projects/:startDate/:endDate'} element={<ProjectsPage/>}/>
                <Route path={'/main'} element={<MainPage/>}/>

                <Route path={"*"} element={hasWorkspaceId  ? <Navigate to={'/calendar'}/> : <Navigate to={'/main'}/>}/>
            </Routes>
    );
}

export default App;
