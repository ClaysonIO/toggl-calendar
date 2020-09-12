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

    if(!query['page']){
        query['page'] = localStorage.getItem('workSpaceId') ? 'calendar' : 'main';
    }

    return (
            <Switch>
                <Route path={'/settings'} component={SettingsPage}/>
                <Route path={'/calendar'} component={CalendarPage}/>
                <Route path={'/main'} component={MainPage}/>

                <Route component={MainPage}/>
            </Switch>
    );
}

export default App;
