import React from 'react';
import {observer} from "mobx-react";
import {Dayjs} from "dayjs";
import {HeaderDate} from "./HeaderDate";

export const HeaderRow = observer(({dates, gridCols}: {dates: Dayjs[], gridCols: string})=>{
    return (
        <div className={"row header"} style={{gridTemplateColumns: gridCols}}>
            <div/>
            <div>Project</div>
            <div>Company</div>
            {dates.map((val, index)=>(<HeaderDate key={index} date={val}/>))}
            <div className={'sumCol'}>Sum of Time</div>
        </div>
    )
})