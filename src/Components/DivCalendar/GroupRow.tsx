import React, {useState} from 'react';
import {observer} from "mobx-react";
import {Group} from "../../Utilities/Group";
import {Dayjs} from "dayjs";
import {ExpandButton} from "../ExpandButton";
import {Cell} from "./Cell";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {EmptyRow} from "./ExmptyRow";
import {ProjectRow} from "./ProjectRow";
import {GroupMenu} from "./GroupMenu";

export const GroupRow = observer(({group, dates, displayType, gridCols}: {group: Group, dates: Dayjs[], displayType: string, gridCols: string})=>{
    const [open, setOpen] = useState(false);
    const color = group.color || "#ff8330";
    const textColor = "white";

    return (
        <div className={'rowContainer'}
             style={{
                 backgroundColor: color,
                 boxShadow: `0 0 0 ${color}`,
             }}>
            <div
                className={"row projectRow"}
                style={{
                    backgroundColor: color,
                    borderColor: color,
                    gridTemplateColumns: gridCols,
                }}>
                <ExpandButton expanded={group.expanded} setExpanded={group.setExpanded}/>
                <div className={'title'} style={{color: textColor}}>{group.name}</div>
                <div className={'title'} style={{color: textColor}}/>
                {dates.map((val, index)=>(<Cell key={index} expanded={group.expanded} displayType={displayType} day={group.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: textColor}}>
                    {DecimalToDisplayType(group.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}
                </div>
                <GroupMenu group={group} setOpen={setOpen}/>
            </div>
            {group.expanded ?
                <React.Fragment>
                    {group.projects.length ? group.projects.map((project, index)=>{
                        return (<ProjectRow key={index} project={project} dates={dates} displayType={displayType} gridCols={gridCols} inheritBackgroundColor={true}/>)
                    }) : <EmptyRow/>}
                </React.Fragment>
                : <React.Fragment/>}
            <div>
            </div>
        </div>
    )
})