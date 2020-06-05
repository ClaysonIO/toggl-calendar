import React, {useEffect} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
import {appState} from "../App";
import dayjs from "dayjs";

interface ICalendar{
    workSpace: WorkSpace;
    dateString?: string;
}

export const Calendar = observer(({workSpace, dateString}: ICalendar)=>{

    useEffect(()=>{
        if(appState.selectedWorkSpace){
            appState.selectedWorkSpace.getTasks(dayjs().startOf('week'), dayjs().endOf('week'))
                .then(result=>console.log(result))
                .catch(err=>console.error(err));
        }
    })
    return (
        <div>

        </div>
    )
});