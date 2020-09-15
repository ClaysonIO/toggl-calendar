import React, {useEffect, useState} from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {CalendarContainer} from "../Components/DivCalendar/Container";
import {useLocation} from "react-router";
import dayjs, {Dayjs} from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {DisplayTypeSelect} from "../Components/DisplayTypeSelect";
import {CalendarDateNav} from "../Components/CalendarDateNav";
import {EmailList} from "../Components/EmailList";

export const CalendarPage = () =>{

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

    const workspace_id = appState.selectedWorkSpace?.id;
    useEffect(()=>{
            if(appState.selectedWorkSpace && startDate && endDate){
                appState.selectedWorkSpace
                    .getTasks(dayjs(startDate), dayjs(endDate))
                    .catch(err=>{
                        alert(err);
                        console.error(err)
                    });
            }
        }
        , [workspace_id, startDate, endDate])

    return (
        <Layout>
            <h2>Calendar</h2>

            <div style={{display: 'flex', marginBottom: '20px'}}>
                <DisplayTypeSelect displayType={displayType} setDisplayType={setDisplayType}/>
                <div style={{flex: 1}}/>
                <CalendarDateNav/>
            </div>

            {appState.selectedWorkSpace ?
                <CalendarContainer workSpace={appState.selectedWorkSpace} displayType={displayType} dates={dates}/> : ""}

            {appState.selectedWorkSpace && appState.selectedWorkSpace.emails.length ?
                <EmailList workSpace={appState.selectedWorkSpace}/> : <React.Fragment/> }
        </Layout>
    )
}