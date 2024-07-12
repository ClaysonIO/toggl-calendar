import React, {useState} from 'react';
import {observer} from "mobx-react";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Cell} from "./Cell";
import {ExpandButton} from "../ExpandButton";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {TagRow} from "./TagRow";
import {ProjectMenu} from "./ProjectMenu";

export const ProjectRow = observer(({project, dates, displayType, gridCols, inheritBackgroundColor}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string, inheritBackgroundColor?: boolean})=>{
    const [open, setOpen] = useState(false);

    return (
        <div className={'rowContainer'}
             style={{
                 boxShadow: `0 0 0 ${project.color}`
             }}>
            <div
                className={`row projectRow`}
                style={{
                    gridTemplateColumns: gridCols,
                    borderColor: project.color,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderTopColor: project.color,
                    borderLeftColor: open ? project.color : "rgba(0,0,0,0)",
                    borderRightColor: open ? project.color : "rgba(0,0,0,0)",
                    borderBottomColor: open ? project.color : "rgba(0,0,0,0)",
                    backgroundColor: inheritBackgroundColor ? "rgba(255,255,255,0.75)" : "#FFF"
                }}>
                <ExpandButton expanded={project.expanded} setExpanded={project.setExpanded}/>
                <div className={'title'} style={{color: project.color}}>{project.name}</div>
                <div className={'title'} style={{color: project.color}}>{project.client}</div>
                {dates.map((val, index)=>(<Cell key={index} expanded={project.expanded} displayType={displayType} day={project.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: project.color}}>{DecimalToDisplayType(project.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
                <ProjectMenu project={project} setOpen={setOpen}/>
            </div>
            {project.expanded ?
                project.tags.map((tag, index)=>{
                    return (<TagRow key={index} tag={tag} dates={dates} displayType={displayType} gridCols={gridCols} inheritBackgroundColor={inheritBackgroundColor}/>)
                })
                : <React.Fragment/>}
        </div>
    )
})