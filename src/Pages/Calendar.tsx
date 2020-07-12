import React, {useEffect, useState} from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {DraggableCalendar} from "../Components/DraggableCalendar";
import {CalendarContainer} from "../Components/DivCalendar/Container";
import {useLocation} from "react-router";
import dayjs, {Dayjs} from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";

export const CalendarPage = () =>{

    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [dates, setDates] = useState<Dayjs[]>([]);

    useEffect(()=>{

        const tempDates: Dayjs[] = [];
        let currentDayjs = dayjs(startDate);
        let endDayjs = dayjs(endDate);
        while(currentDayjs.isBefore(endDayjs, 'day') || currentDayjs.isSame(endDayjs, 'day')){
            console.log("Loopping Day...")
            tempDates.push(currentDayjs);
            currentDayjs = currentDayjs.add(1, 'day');
        }
        setDates(tempDates);
    }, [startDate, endDate]);


    return (
        <Layout>
            <h2>Calendar</h2>

            {appState.selectedWorkSpace ? <CalendarContainer workSpace={appState.selectedWorkSpace} dates={dates}/> : ""}
            {appState.selectedWorkSpace ? <DraggableCalendar workSpace={appState.selectedWorkSpace}/> : ""}
        </Layout>
    )
}