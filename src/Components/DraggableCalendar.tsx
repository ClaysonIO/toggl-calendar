import React, {useEffect, useState} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
import dayjs, {Dayjs} from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {useParams} from "react-router-dom";
import './DraggableCalendar.css'
import {DragDropContext} from "react-beautiful-dnd";
import {DisplayTypeSelect} from "./DisplayTypeSelect";
import {CalendarHeader} from "./CalendarHeader";
import {CalendarBody} from "./CalendarBody";
import {CalendarFooter} from "./CalendarFooter";
import {CalendarDateNav} from "./CalendarDateNav";

dayjs.extend(customParseFormat)

interface ICalendar{
    workSpace: WorkSpace;
}

export const DraggableCalendar = observer(({workSpace}: ICalendar)=>{
    const {startDate, endDate} = useParams();
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>(window.localStorage.getItem('displayType') as any || 'time')


    const dates: Dayjs[] = [];
    if(startDate && endDate){
        let startPoint = dayjs(startDate);
        while(startPoint.isBefore(dayjs(endDate), 'day') || startPoint.isSame(dayjs(endDate), 'day')){
            dates.push(startPoint);
            startPoint = startPoint.add(1, 'day');
        }
    }

    const workspace_id = workSpace?.id;
    useEffect(()=>{
            if(workSpace && startDate && endDate){
                workSpace
                    .getTasks(dayjs(startDate), dayjs(endDate))
                    .catch(err=>{
                        alert(err);
                        console.error(err)
                    });
            }
        }
        , [workSpace, workspace_id, startDate, endDate])


    return workSpace ? (
        <React.Fragment>
            <div style={{display: 'flex'}}>
                <DisplayTypeSelect displayType={displayType} setDisplayType={setDisplayType}/>
                <div style={{flex: 1}}/>
                <CalendarDateNav/>
            </div>
            <DragDropContext onDragEnd={workSpace.orderProject}>
                <table className={'draggableCalendar'}>
                    <CalendarHeader dates={dates}/>
                    <CalendarBody dates={dates} workSpace={workSpace} displayType={displayType}/>
                    <CalendarFooter dates={dates} workSpace={workSpace} displayType={displayType}/>
                </table>
            </DragDropContext>
        </React.Fragment>
    ) : (
        <h3>No Workspace Selected</h3>
    )
});


