import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {CalendarPage} from "./Pages/Calendar";
import {AppProvider} from "./Utilities/AppContext";

function App() {
    return (
        <AppProvider>
            <Routes>
                <Route path={'/calendar'} element={<CalendarPage/>}/>
                <Route path={"*"} element={<Navigate to={'/calendar'}/>}/>
            </Routes>
        </AppProvider>
    );
}

export default App;
