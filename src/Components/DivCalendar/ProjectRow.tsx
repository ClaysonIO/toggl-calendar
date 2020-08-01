import React from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Cell} from "./Cell";
import {ExpandButton} from "../ExpandButton";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {TagRow} from "./TagRow";

export const ProjectRow = observer(({project, dates, displayType, gridCols, isDragging}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string, isDragging: boolean})=>{

    return (
        <div className={'rowContainer'}
             style={{
                 boxShadow: `${isDragging ? '0 2px .8rem' : "0 0 0"} ${project.color}`,
             }}>
            <div
                className={`row projectRow ${isDragging ? 'selected' : ''}`}
                style={{
                    gridTemplateColumns: gridCols,
                    borderColor: project.color,
                }}>
                <ExpandButton expanded={project.expanded} setExpanded={project.setExpanded}/>
                <div className={'title'} style={{color: project.color}}>{project.name}</div>
                <div className={'title'} style={{color: project.color}}>{project.client}</div>
                {dates.map((val, index)=>(<Cell key={index} expanded={project.expanded} displayType={displayType} day={project.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: project.color}}>{DecimalToDisplayType(project.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
            </div>
            {project.expanded ?
                project.tags.map((tag, index)=>{
                    return (<TagRow key={index} tag={tag} dates={dates} displayType={displayType} gridCols={gridCols}/>)
                })
                : <React.Fragment/>}
        </div>
    )
})