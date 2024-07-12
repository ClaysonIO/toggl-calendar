import React, {useMemo} from 'react';
import {observer} from "mobx-react";
import Creatable from "react-select/creatable";
import Popup from "reactjs-popup";
import {Project} from "../../Utilities/Project";
import {Group} from "../../Utilities/Group";
import {appState} from "../../App";
import {WorkSpaceSelect} from "../WorkSpaceSelect";

export const ProjectMenu = observer(({project, setOpen}: {project: Project, setOpen: Function})=>{
    const workSpace = useMemo(()=>{
        return appState.selectedWorkSpace;
    }, [])
    if(!workSpace){
        return <WorkSpaceSelect/>
    }

    function selectGroup(group?: Group){
        project.setGroup({group});
    }

    function createGroup(groupName: string){
        const group = workSpace?.createGroup(groupName);
        project.setGroup({group});
    }

    const options: {label: string, value: string, data?: any}[] = [
        {label: 'No Group', value: '', data: new Group({name: ''}, workSpace)}
    ]
        .concat((workSpace?.groups || []).map(val=>({
            label: val.name,
            value: val.rowId,
            data: val
        })));

    return (<Popup
        onOpen={()=>setOpen(true)}
        onClose={()=>setOpen(false)}
        trigger={<div>
            <button className={'menuButton'}>&#9679;&#9679;&#9679;</button>
        </div>} position={"left center"}>
        <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${project.color}`,
            padding: '10px',
            width: '200px',
            boxShadow: `0 2px .8rem ${project.color}`
        }}>
            Add to Group
            <Creatable
                placeholder={"Select or Create New"}
                value={options.find(val=>val.data.projectIds.indexOf(project.rowId) > -1)}
                options={options}
                onCreateOption={createGroup}
                //@ts-ignore
                onChange={(item)=>selectGroup(item.data)}
            />
            Set Emails
            <Creatable
                placeholder={"Select or Create New"}
                isMulti={true}
                value={project.emails.map(val=>({value: val, label: val}))}
                options={project.workSpace.emails.map(val=>({value: val, label: val}))}
                onCreateOption={project.createEmail}
                //@ts-ignore
                onChange={(item)=>project.setEmails((item || []).map(val=>val.value))}
            />
        </div>
    </Popup>)
})