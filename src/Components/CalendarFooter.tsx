import {observer} from "mobx-react-lite";
import {Dayjs} from "dayjs";
import {WorkSpace} from "../Utilities/WorkSpace";
import React from "react";

export const CalendarFooter = observer(({dates, displayType, workSpace}: { dates: Dayjs[], displayType: string, workSpace: WorkSpace }) => {


    function getDateSum(date: Dayjs) {
        switch (displayType) {
            case "time":
                return workSpace.sumDayClockTime(date);
            case "roundedTime":
                return workSpace.sumDayRoundedHours(date);
            case "description":
                return workSpace.sumDayClockTime(date);
            default:
                return "";
        }
    }


    function getWeekSum(dates: Dayjs[]) {
        const startDate = dates[0];
        const endDate = dates[dates.length - 1]

        switch (displayType) {
            case "time":
                return workSpace.sumWeekClockTime(startDate, endDate);
            case "roundedTime":
                return workSpace.sumWeekRoundedHours(startDate, endDate);
            case "description":
                return workSpace.sumWeekClockTime(startDate, endDate);
            default:
                return "";
        }
    }

    return (
        <tfoot>
        <tr className={'row'}>
            <th/>
            <th/>
            <th/>
            {dates.map((val, index) => (
                <th className={'dateCol'} key={index}>
                    <div>{getDateSum(val)}</div>
                </th>))}
            <th className={'sumCol'}>
                <div>{getWeekSum(dates)}</div>
            </th>
        </tr>
        </tfoot>
    )
})