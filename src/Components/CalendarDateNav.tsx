import React, {useEffect} from "react";
import {Link, useHistory, useParams} from "react-router-dom";
import dayjs from "dayjs";

export const CalendarDateNav = ()=>{
    const {startDate, endDate} = useParams();
    const history = useHistory();

    const navLinks = {
        back: `/calendar/${dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`,
        today:`/calendar/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`,
        forward:`/calendar/${dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`
    }


    useEffect(()=>{
            if(!startDate || !endDate){
                history.push(`/calendar/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`)
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