import React, {useEffect} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import dayjs from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";

const todayWeekStart = () => dayjs().startOf("week").format("YYYY-MM-DD");
const todayWeekEnd = () => dayjs().endOf("week").format("YYYY-MM-DD");

export interface CalendarDateNavProps {
    onTodayClick?: (weekStart: string, weekEnd: string) => void;
}

export const CalendarDateNav = ({onTodayClick}: CalendarDateNavProps) => {
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const navigate = useNavigate();

    const navLinks = {
        back: `/week?startDate=${
            dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`,
        today: `/week?startDate=${todayWeekStart()}&endDate=${todayWeekEnd()}`,
        forward:`/week?startDate=${
            dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`
    };

    function clickToday() {
        onTodayClick?.(todayWeekStart(), todayWeekEnd());
    }

    useEffect(()=>{
            if(!startDate || !endDate){
                navigate(`/week?startDate=${
                    dayjs().startOf('week').format('YYYY-MM-DD')
                }&endDate=${dayjs().endOf('week').format('YYYY-MM-DD')}`)
            }
        }
        // Needed to ignore history
        // eslint-disable-next-line
        , [startDate, endDate])

    return (
        <div className={"calendarDisplayButtonGroup"}>
            <Link to={navLinks.back}><button type={"button"} className={"calendarHeaderButton"}>&lt;</button></Link>
            <Link to={navLinks.today} onClick={clickToday}><button type={"button"} className={"calendarHeaderButton"}>Today</button></Link>
            <Link to={navLinks.forward}><button type={"button"} className={"calendarHeaderButton"}>&gt;</button></Link>
        </div>
    );
};
