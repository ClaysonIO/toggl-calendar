import React, {useState} from 'react';
import {observer} from "mobx-react";
import {Tag} from "../../Utilities/Tag";
import {ExpandButton} from "../ExpandButton";
import {Cell} from "./Cell";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {Dayjs} from "dayjs";
import {TagMenu} from "./TagMenu";

export const TagRow = observer(({tag, dates, displayType, gridCols, inheritBackgroundColor}: {tag: Tag, dates: Dayjs[], displayType: string, gridCols: string, inheritBackgroundColor?: boolean})=>{
    const [open, setOpen] = useState(false);
    return (
        <div className={'rowContainer'}
             style={{
                 boxShadow: `${open ? '0 2px .8rem' : "0 0 0"} ${tag.color}`
             }}>
            <div className={"row tagRow"} style={{
                gridTemplateColumns: gridCols,
                borderColor: tag.project.color,
                backgroundColor: inheritBackgroundColor ? "rgba(255,255,255,0.9)" : "#FFF"}}>
                <div/>
                <ExpandButton expanded={tag.expanded} setExpanded={tag.setExpanded}/>
                <div className={''} style={{color: tag.project.color}}>{tag.name || "--Untagged--"}</div>
                {/*<div className={'title'} style={{color: tag.project.color}}>{tag.project.client}</div>*/}
                {dates.map((val, index)=>(<Cell key={index} expanded={tag.expanded} displayType={displayType} day={tag.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: tag.project.color}}>{DecimalToDisplayType(tag.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
                {tag.name ? <TagMenu tag={tag} setOpen={setOpen}/> : <React.Fragment/>}
            </div>
        </div>
    )
})