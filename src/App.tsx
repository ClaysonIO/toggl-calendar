import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {CalendarPage} from "./Pages/Calendar";
import {YearPage} from "./Pages/Year";
import {AppProvider} from "./Utilities/AppContext";

function App() {
    return (
        <AppProvider>
            <Routes>
                <Route path={'/week'} element={<CalendarPage/>}/>
                <Route path={'/year'} element={<YearPage/>}/>
                <Route path={'/calendar'} element={<Navigate to={'/week'} replace/>}/>
                <Route path={"*"} element={<Navigate to={'/week'}/>}/>
            </Routes>
        </AppProvider>
    );
}

export default App;
