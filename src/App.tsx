import React from 'react';
import {BrowserRouter, Route, Switch} from "react-router-dom";
import {SettingsPage} from "./Pages/Settings";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";
import {MainPage} from "./Pages/Main";

export const appState = new AppState();

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path={"/settings"} component={SettingsPage}/>
                <Route path={"/calendar/:startDate?/:endDate?"} component={CalendarPage}/>
                <Route component={MainPage}/>
            </Switch>
        </BrowserRouter>
    );
}

export default App;
