import React from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";

export const ProjectRow = observer(({project}: {project: Project})=>{
    return (
        <div className={"row"} style={{gridTemplateColumns: "40px 150px 100px repeat(7, 1fr) 75px;"}}>

            <div></div>
        </div>
    )
})