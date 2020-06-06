import React, {useEffect, useState} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
import {appState} from "../App";
import dayjs, {Dayjs} from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {Project} from "../Utilities/Project";
import {useHistory, useParams} from "react-router-dom";
import {Day} from "../Utilities/Day";

dayjs.extend(customParseFormat)

interface ICalendar{
    workSpace: WorkSpace;
    dateString?: string;
}

export const Calendar = observer(({workSpace, dateString}: ICalendar)=>{
    const {startDate, endDate} = useParams();
    const history = useHistory();
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>('time')

    function toggleDisplayType(){
        switch(displayType){
            case "time": setDisplayType('roundedTime');break;
            case "roundedTime": setDisplayType('description');break;
            case "description": setDisplayType('time');break;
            default: setDisplayType('time');
        }
    }

    const dates: Dayjs[] = [];
    if(startDate && endDate){
        let startPoint = dayjs(startDate);
        while(startPoint.isBefore(dayjs(endDate), 'day') || startPoint.isSame(dayjs(endDate), 'day')){
            dates.push(startPoint);
            startPoint = startPoint.add(1, 'day');
        }
    }

    const workspace_id = appState.selectedWorkSpace?.id;
    useEffect(()=>{
            if(appState.selectedWorkSpace && startDate && endDate){
                appState.selectedWorkSpace
                    .getTasks(dayjs(startDate), dayjs(endDate))
                    .then(result=>console.log(result))
                    .catch(err=>{
                        alert(err);
                        console.error(err)
                    });
            }

            if(!startDate || !endDate){
                history.push(`/calendar/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`)
            }
        }
        , [workspace_id, startDate, endDate])
    return (
        <React.Fragment>
            <button onClick={toggleDisplayType}>{displayType}</button>
            <table>
                <thead>
                <tr>
                    <th>Project</th>
                    <th>Company</th>
                    {dates.map((val, index)=>(<th key={index}>{val.toDate().toLocaleDateString()}</th>))}
                    <th>Sum of Time</th>
                </tr>
                </thead>
                <tbody>
                {appState.selectedWorkSpace?.projects.map((val, index)=>(<CalendarTableRow key={index} project={val} dates={dates} displayType={displayType}/>))}
                </tbody>

            </table>
        </React.Fragment>
    )
});

const CalendarTableRow = observer(({project, dates, displayType}: {project: Project, dates: Dayjs[], displayType: string})=>{


    function getText(projectDate: Day, displayType: string){
        switch(displayType) {
            case "time": return projectDate?.hours.toString();
            case "roundedTime": return projectDate?.roundedHours;
            case "description": return projectDate?.tasks.join('\n');
            default: return "";
        }
    }

    return (
        <tr>
            <th style={{color: project.project_hex_color || 'black'}}>{project.name}</th>
            <th style={{color: project.project_hex_color || 'black'}}>{project.client}</th>
            {dates.map((date, index)=>{
                const projectDate = project.dateHash[date.format('YYYYMMDD')];

                return (<SingleCalendarCell key={index} text={getText(projectDate, displayType)}/>);
            })}
            <th style={{color: project.project_hex_color || 'black'}}>{project.client}</th>
        </tr>
    )
})

const SingleCalendarCell = ({text}: {text?: string})=>{
    function copyToClipboard(event: React.MouseEvent){
        const range = document.createRange();
        const textNode = event.currentTarget;
        if(textNode){
            range.selectNode(textNode);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            document.execCommand("copy");
        }
    }

    return (
        <td>
            <button onClick={copyToClipboard} style={{display: "flex"}}>
                {text}
            </button>
        </td>)
}