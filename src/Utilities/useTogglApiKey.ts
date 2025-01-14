import React from 'react';

export function useTogglApiKey(){
    const [togglApiKey, setTogglApiKey] = React.useState(localStorage.getItem('togglApiKey') || '');

    React.useEffect(()=>{
        localStorage.setItem('togglApiKey', togglApiKey || '');
    }, [togglApiKey]);

    return {togglApiKey, setTogglApiKey};
}