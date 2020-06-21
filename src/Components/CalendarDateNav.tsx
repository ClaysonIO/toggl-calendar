import React, {useEffect} from "react";
import {Link, useHistory, useLocation} from "react-router-dom";
import dayjs from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";

export const CalendarDateNav = ()=>{
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const history = useHistory();

    const navLinks = {
        back: `/?page=calendar&startDate=${
            dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`,
        today:`/?page=calendar&startDate=${
            dayjs().startOf('week').format('YYYY-MM-DD')
        }&endDate=${dayjs().endOf('week').format('YYYY-MM-DD')}`,
        forward:`/?page=calendar&startDate=${
            dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')
        }&endDate=${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`
    }


    useEffect(()=>{
            if(!startDate || !endDate){
                history.push(`/?page=calendar&startDate=${
                    dayjs().startOf('week').format('YYYY-MM-DD')
                }&endDate=${dayjs().endOf('week').format('YYYY-MM-DD')}`)
            }
        }
        // Needed to ignore history
        // eslint-disable-next-line
        , [startDate, endDate])

    return (
        <div>
            <Link to={navLinks.back}><button>&lt;</button></Link>
            <Link to={navLinks.today}><button>Today</button></Link>
            <Link to={navLinks.forward}><button>&gt;</button></Link>
        </div>
    )
}