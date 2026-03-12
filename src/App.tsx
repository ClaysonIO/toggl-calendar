import React from 'react';
import {Navigate, Route, Routes} from "react-router-dom";
import {WeekPage} from "./Pages/Week";
import {YearPage} from "./Pages/Year";
import {ProjectsPage} from "./Pages/Projects";
import {HelpPage} from "./Pages/Help";
import {AppProvider} from "./Utilities/AppContext";

function App() {
    return (
        <AppProvider>
            <Routes>
                <Route path={'/week'} element={<WeekPage/>}/>
                <Route path={'/year'} element={<YearPage/>}/>
                <Route path={'/projects'} element={<ProjectsPage/>}/>
                <Route path={'/help'} element={<HelpPage/>}/>
                <Route path={'/calendar'} element={<Navigate to={'/week'} replace/>}/>
                <Route path={"*"} element={<Navigate to={'/week'}/>}/>
            </Routes>
        </AppProvider>
    );
}

export default App;
