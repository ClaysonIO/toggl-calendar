import React from "react";
import {observer} from "mobx-react";
import {appState} from "../App";
import Select from "react-select";
import {useSelectedWorkspace_id} from "../Utilities/useSelectedWorkspace";

export const WorkSpaceSelect = observer(()=>{

    const {setWorkspace_id} = useSelectedWorkspace_id();

    function selectWorkSpace(e: any){
        const workSpace = appState.workSpaces.find(val=>val.id === e.value);
        appState.selectWorkSpace(workSpace);
        setWorkspace_id(e.value);
    }

    const value = appState.selectedWorkSpace ? {value: appState.selectedWorkSpace.id, label: appState.selectedWorkSpace.name} : undefined;

    return appState.workSpaces.length ? (
        <div className={'select'} style={{width: "200px"}}>
            <Select onChange={selectWorkSpace} value={value} options={appState.workSpaces.map(val=>({value: val.id, label: val.name}))}/>
        </div>
    ) : <React.Fragment/>
})