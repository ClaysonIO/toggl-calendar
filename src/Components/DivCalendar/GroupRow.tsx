import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";
import {Dayjs} from "dayjs";
import {ExpandButton} from "../ExpandButton";
import {Cell} from "./Cell";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {ProjectRowDraggable} from "./ProjectRowDraggable";

export const GroupRow = observer(({group, dates, displayType, gridCols}: {group: Group, dates: Dayjs[], displayType: string, gridCols: string})=>{
    const color = "#ff8330"
    
    return (
        <div className={'rowContainer'}>
            <div className={"row projectRow"} style={{gridTemplateColumns: gridCols, borderColor: color}}>
                <ExpandButton expanded={group.expanded} setExpanded={group.setExpanded}/>
                <div className={'title'} style={{color: color}}>{group.name}</div>
                <div className={'title'} style={{color: color}}/>
                {dates.map((val, index)=>(<Cell key={index} expanded={group.expanded} displayType={displayType} day={group.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: color}}>{DecimalToDisplayType(group.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
            </div>
            {group.expanded ?
                group.projects.map((project, index)=>{
                    return (<ProjectRowDraggable key={index} project={project} dates={dates} displayType={displayType} gridCols={gridCols} index={index}/>)
                })
                : <React.Fragment/>}
        </div>
    )
})