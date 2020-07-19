import React from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Cell} from "./Cell";
import {ExpandButton} from "../ExpandButton";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";

export const ProjectRow = observer(({project, dates, displayType, gridCols}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string})=>{

    return (
        <React.Fragment>
            <div className={"row projectRow"} style={{gridTemplateColumns: gridCols, borderColor: project.project_hex_color}}>
                <ExpandButton expanded={project.expanded} setExpanded={project.setExpanded}/>
                <div className={'title'} style={{color: project.project_hex_color}}>{project.name}</div>
                <div className={'title'} style={{color: project.project_hex_color}}>{project.client}</div>
                {dates.map((val, index)=>(<Cell key={index} expanded={project.expanded} displayType={displayType} day={project.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: project.project_hex_color}}>{DecimalToDisplayType(project.timeAsHours(dates[0].toISOString(), dates[dates.length -1].toISOString()), displayType)}</div>
            </div>

        </React.Fragment>
    )
})