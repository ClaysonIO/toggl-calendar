import React from "react";
import {Dayjs} from "dayjs";

export const HeaderDate = ({date}: {date: Dayjs})=>{
    return <div>
        <div>{date.format('dddd')}</div>
        <div>{date.toDate().toLocaleDateString()}</div>
    </div>
}