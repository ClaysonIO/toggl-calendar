import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";

export const appState = new AppState();

function App() {
    return (
        <Routes>
            <Route path={'/calendar'} element={<CalendarPage/>}/>
            <Route path={"*"} element={<Navigate to={'/calendar'}/>}/>
        </Routes>
    );
}

export default App;
