import React, {useEffect} from "react";
import {Link, useHistory, useLocation} from "react-router-dom";
import dayjs from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {appState} from "../App";

export const CalendarDateNav = ()=>{
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const history = useHistory();

    const navLinks = {
        back: `/calendar?startDate=${
            dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`,
        today:`/calendar?startDate=${
            dayjs().startOf('week').format('YYYY-MM-DD')
        }&endDate=${dayjs().endOf('week').format('YYYY-MM-DD')}`,
        forward:`/calendar?startDate=${
            dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`
    }

    function clickToday(event: any){
        //Force refresh of tasks if clicked when on this week
        if(navLinks.today.split('?').pop() === window.location.search.split('?').pop()){
            event.stopPropagation();
            appState.selectedWorkSpace?.getTasks(dayjs(startDate), dayjs(endDate))
                .catch(err=>{
                    alert(err);
                    console.error(err)
                });
        }
    }

    useEffect(()=>{
            if(!startDate || !endDate){
                history.push(`/calendar?startDate=${
                    dayjs().startOf('week').format('YYYY-MM-DD')
                }&endDate=${dayjs().endOf('week').format('YYYY-MM-DD')}`)
            }
        }
        // Needed to ignore history
        // eslint-disable-next-line
        , [startDate, endDate])

    return (
        <div>
            <Link to={navLinks.back}><button className={'calendarHeaderButton'}>&lt;</button></Link>
            <Link to={navLinks.today} onClick={clickToday}><button className={'calendarHeaderButton'}>Today</button></Link>
            <Link to={navLinks.forward}><button className={'calendarHeaderButton'}>&gt;</button></Link>
        </div>
    )
}