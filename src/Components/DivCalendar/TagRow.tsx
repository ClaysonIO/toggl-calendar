import React from 'react';
import {observer} from "mobx-react-lite";
import {Tag} from "../../Utilities/Tag";
import {ExpandButton} from "../ExpandButton";
import {Cell} from "./Cell";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {Dayjs} from "dayjs";

export const TagRow = observer(({tag, dates, displayType, gridCols}: {tag: Tag, dates: Dayjs[], displayType: string, gridCols: string})=>{
    return (
        <div className={'rowContainer'}>
            <div className={"row projectRow"} style={{gridTemplateColumns: gridCols, borderColor: tag.project.project_hex_color}}>
                <div/>
                <ExpandButton expanded={tag.expanded} setExpanded={tag.setExpanded}/>
                <div className={''} style={{color: tag.project.project_hex_color}}>{tag.name || "--Untagged--"}</div>
                {/*<div className={'title'} style={{color: tag.project.project_hex_color}}>{tag.project.client}</div>*/}
                {dates.map((val, index)=>(<Cell key={index} expanded={tag.expanded} displayType={displayType} day={tag.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: tag.project.project_hex_color}}>{DecimalToDisplayType(tag.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
            </div>
        </div>
    )
})