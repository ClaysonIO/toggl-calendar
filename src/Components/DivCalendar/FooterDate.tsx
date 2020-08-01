import React from "react";
import {Dayjs} from "dayjs";
import {Row} from "../../Utilities/Row";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";

export const FooterDate = ({day, rows, displayType}: {day: Dayjs, rows: (Row|null)[], displayType: string})=>{
    const decimalHours = rows.reduce((acc, row)=>{
        return acc + (row?.dateHash[day.format('YYYYMMDD')]?.timeAsHours || 0)
    }, 0);

    return <div>
        <div>{DecimalToDisplayType(decimalHours, displayType)}</div>
    </div>
}