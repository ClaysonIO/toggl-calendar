import React from "react";
import {Dayjs} from "dayjs";

export const HeaderDate = ({date}: {date: Dayjs})=>{
    return <div style={{overflow: "hidden"}}>
        <div>{date.format('dddd')}</div>
        <div>{date.toDate().toLocaleDateString()}</div>
    </div>
}