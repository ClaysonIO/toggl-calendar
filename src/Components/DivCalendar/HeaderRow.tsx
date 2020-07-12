import React from 'react';
import {observer} from "mobx-react-lite";
import {Dayjs} from "dayjs";
import {HeaderDate} from "./HeaderDate";

export const HeaderRow = observer(({dates, gridTemplateColumns}: {dates: Dayjs[], gridTemplateColumns: string})=>{
    console.log("dATES", dates)
    return (
        <div className={"row header"} style={{gridTemplateColumns}}>
            <div></div>
            <div>Project</div>
            <div>Company</div>
            {dates.map((val, index)=>(<HeaderDate key={index} date={val}/>))}
            <div>Sum of Time</div>
        </div>
    )
})