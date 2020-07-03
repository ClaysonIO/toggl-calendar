import React, {useEffect, useState} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
import dayjs, {Dayjs} from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {useLocation} from "react-router-dom";
import './DraggableCalendar.css'
import {DisplayTypeSelect} from "./DisplayTypeSelect";
import {CalendarHeader} from "./CalendarHeader";
import {CalendarBody} from "./CalendarBody";
import {CalendarFooter} from "./CalendarFooter";
import {CalendarDateNav} from "./CalendarDateNav";
import {splitQuery} from "../Utilities/Functions/SplitQuery";

dayjs.extend(customParseFormat)

interface ICalendar{
    workSpace: WorkSpace;
}

export const DraggableCalendar = observer(({workSpace}: ICalendar)=>{

    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);

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
            <table className={'draggableCalendar'}>
                <CalendarHeader dates={dates}/>
                <CalendarBody dates={dates} workSpace={workSpace} displayType={displayType}/>
                <CalendarFooter dates={dates} workSpace={workSpace} displayType={displayType}/>
            </table>
        </React.Fragment>
    ) : (
        <h3>No Workspace Selected</h3>
    )
});


