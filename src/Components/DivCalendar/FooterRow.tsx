import React from 'react';
import {observer} from "mobx-react";
import {Dayjs} from "dayjs";
import {Row} from "../../Utilities/Row";
import {FooterDate} from "./FooterDate";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";

export const FooterRow = observer(({dates, rows, displayType, gridCols}: {dates: Dayjs[], rows: (Row|null)[], displayType: string, gridCols: string})=>{
    const decimalHours = dates
        .reduce((acc, day)=>{
        return acc + rows.reduce((acc, row)=>{
            return acc + (row?.dateHash[day.format('YYYYMMDD')]?.timeAsHours || 0)
        }, 0);
    }, 0);

    return (
        <div className={"row projectRow"} style={{gridTemplateColumns: gridCols}}>
            <div/>
            <div className={'title'}>Total</div>
            <div/>
            {dates.map((val, index)=>(<FooterDate key={index} day={val} rows={rows} displayType={displayType}/>))}
            <div className={'title sumCol'}>{DecimalToDisplayType(decimalHours, displayType)}</div>
        </div>
    )
})