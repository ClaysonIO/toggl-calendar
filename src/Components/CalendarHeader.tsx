import {observer} from "mobx-react-lite";
import {Dayjs} from "dayjs";
import React from "react";

export const CalendarHeader = observer(({dates}: { dates: Dayjs[] }) => {

    return (
        <thead>
        <tr className={'row'}>
            <th className={'expandCol'}/>
            <th className={'projectCol'}>Project</th>
            <th className={'companyCol'}>Company</th>
            {dates.map((val, index) => (
                <th className={'dateCol'} key={index}>
                    <div>{val.format('dddd')}</div>
                    <div>{val.toDate().toLocaleDateString()}</div>
                </th>))}
            <th className={'sumCol'}>Sum of Time</th>
        </tr>
        </thead>
    )
})