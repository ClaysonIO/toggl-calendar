import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";
import {Dayjs} from "dayjs";
import {ExpandButton} from "../ExpandButton";
import {Cell} from "./Cell";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {ProjectRowDraggable} from "./ProjectRowDraggable";
import {EmptyRow} from "./ExmptyRow";

export const GroupRow = observer(({group, dates, displayType, gridCols, isDragging}: {group: Group, dates: Dayjs[], displayType: string, gridCols: string, isDragging: boolean})=>{
    const color = group.color || "#ff8330";
    const textColor = "white";

    return (
        <div className={'rowContainer'}
             style={{
                 backgroundColor: color,
                 boxShadow: `${isDragging ? '0 2px .8rem' : "0 0 0"} ${color}`,
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
            </div>
            {group.expanded ?
                <React.Fragment>
                    {group.projects.length ? group.projects.map((project, index)=>{
                        return (<ProjectRowDraggable key={index} project={project} dates={dates} displayType={displayType} gridCols={gridCols} index={index}/>)
                    }) : <EmptyRow/>}

                    {/*TODO: This should allow dropping projects into it*/}
{/*                    <Droppable droppableId={`droppable_${group.rowId}`} type={"groupDroppable"}>*/}
{/*                        {(provided, snapshot) => (*/}
{/*                            <div*/}
{/*                                id={`droppable_${group.rowId}`}*/}
{/*                                ref={provided.innerRef}*/}
{/*                                {...provided.droppableProps}*/}
{/*                            >*/}
{/*<div style={{borderRadius: '10px', border: 'dashed red 1px', width: '100%', height: '50px'}}/>*/}
{/*                            </div>*/}
{/*                        )}*/}
{/*                    </Droppable>*/}
                </React.Fragment>
                : <React.Fragment/>}
            <div>
            </div>
        </div>
    )
})