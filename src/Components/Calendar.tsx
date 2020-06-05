import React from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";

interface ICalendar{
    workSpace: WorkSpace;
    dateString?: string;
}

export const Calendar = observer(({workSpace, dateString}: ICalendar)=>{

    return (
        <div>

        </div>
    )
});