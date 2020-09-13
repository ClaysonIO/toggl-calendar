import React from 'react';
import {Redirect, Route, Switch} from "react-router-dom";
import {SettingsPage} from "./Pages/Settings";
import {AppState} from "./Utilities/AppState";
import {CalendarPage} from "./Pages/Calendar";
import {MainPage} from "./Pages/Main";

export const appState = new AppState();

function App() {

    return (
            <Switch>
                <Route path={'/settings'} component={SettingsPage}/>
                <Route path={'/calendar'} component={CalendarPage}/>
                <Route path={'/main'} component={MainPage}/>

                <Route
                    render={()=>{
                        return localStorage.getItem('workSpaceId') ? <Redirect to={'/calendar'}/> : <Redirect to={'/main'}/>
                    }}/>
            </Switch>
    );
}

export default App;
