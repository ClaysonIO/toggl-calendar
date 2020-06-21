import React from 'react';
import {Route, Switch, useLocation} from "react-router-dom";
import {SettingsPage} from "./Pages/Settings";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";
import {MainPage} from "./Pages/Main";
import {splitQuery} from "./Utilities/Functions/SplitQuery";

export const appState = new AppState();

function App() {
    const location = useLocation();
    const query = splitQuery(location.search);

    return (
            <Switch>
                {query['page'] === 'settings' ? <Route path={"/"} component={SettingsPage}/> : ''}
                {query['page'] === 'calendar' ? <Route path={"/"} component={CalendarPage}/> : ''}

                <Route component={MainPage}/>
            </Switch>
    );
}

export default App;
