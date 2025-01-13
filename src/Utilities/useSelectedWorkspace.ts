import React from "react";

export function useSelectedWorkspace_id(){

    const [workspace_id, setWorkspace_id] = React.useState(localStorage.getItem('workspace_id') || '');

    React.useEffect(()=>{
        localStorage.setItem('workspace_id', workspace_id || '');
    }, [workspace_id]);

    return {workspace_id, setWorkspace_id};
}