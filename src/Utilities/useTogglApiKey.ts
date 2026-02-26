import React from 'react';
import {TEST_TOGGL_API_KEY} from "./testingEnv";

export function useTogglApiKey(){
    const initialApiKey = localStorage.getItem("togglApiKey")
        || localStorage.getItem("togglApiToken")
        || TEST_TOGGL_API_KEY;
    const [togglApiKey, setTogglApiKey] = React.useState(initialApiKey || "");

    React.useEffect(()=>{
        localStorage.setItem('togglApiKey', togglApiKey || '');
        localStorage.setItem('togglApiToken', togglApiKey || '');
    }, [togglApiKey]);

    return {togglApiKey, setTogglApiKey};
}