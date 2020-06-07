import React, {useEffect, useState} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
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
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>(window.localStorage.getItem('displayType') as any || 'time')

    function moveWeek(forward: boolean){
        if(forward){
            history.push(`/calendar/${dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`)
        } else {
            history.push(`/calendar/${dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`)
        }
    }

    function moveToday(){
            history.push(`/calendar/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`)
    }

    function toggleDisplayType(){
        let nextDisplayType: any = "time";
        switch(displayType){
            case "time": nextDisplayType = 'roundedTime';break;
            case "roundedTime": nextDisplayType = 'description';break;
            case "description": nextDisplayType = 'time';break;
        }
        window.localStorage.setItem('displayType', nextDisplayType);
        setDisplayType(nextDisplayType)
    }

    const dates: Dayjs[] = [];
    if(startDate && endDate){
        let startPoint = dayjs(startDate);
        while(startPoint.isBefore(dayjs(endDate), 'day') || startPoint.isSame(dayjs(endDate), 'day')){
            dates.push(startPoint);
            startPoint = startPoint.add(1, 'day');
        }
    }

    const workspace_id = workSpace?.id;
    useEffect(()=>{
            if(workSpace && startDate && endDate){
                workSpace
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
        // Needed to ignore history
        // eslint-disable-next-line
        , [workspace_id, startDate, endDate])


    return (
        <React.Fragment>
            <div style={{display: 'flex'}}>
                <button onClick={toggleDisplayType}>{displayType}</button>
                <div style={{flex: 1}}/>
                <button onClick={()=>moveWeek(false)}>&lt;</button>
                <button onClick={()=>moveToday()}>Today</button>
                <button onClick={()=>moveWeek(true)}>&gt;</button>
            </div>
            <table style={{width: "100%"}}>
                <thead>
                <tr>
                    <th/>
                    <th>Project</th>
                    <th>Company</th>
                    {dates.map((val, index)=>(
                        <th style={{width: '20%'}} key={index}>
                            <div>{val.format('dddd')}</div>
                            <div>{val.toDate().toLocaleDateString()}</div>
                        </th>))}
                    <th><div style={{width: '75px'}}>Sum of Time</div></th>
                </tr>
                </thead>
                <tbody>
                {workSpace?.projects.map((val, index)=>(<CalendarTableRow key={index} project={val} dates={dates} displayType={displayType}/>))}
                </tbody>

            </table>
        </React.Fragment>
    )
});

const CalendarTableRow = observer(({project, dates, displayType}: {project: Project, dates: Dayjs[], displayType: string})=>{

    const [expanded, setExpanded] = useState(false);

    const {startDate, endDate} = useParams();

    function getText(projectDate: Day, displayType: string){
        switch(displayType) {
            case "time": return projectDate?.hours.toString();
            case "roundedTime": return projectDate?.roundedHours;
            case "description": return projectDate?.tasks.map(val=>(<div>{val}</div>));
            default: return "";
        }
    }

    function getSum(displayType: string){
        switch(displayType) {
            case "time": return project.hours(startDate, endDate);
            case "roundedTime": return project.roundedHours(startDate, endDate);
            case "description": return project.roundedHours(startDate, endDate);
            default: return "";
        }
    }

    return (
        <tr className={expanded ? 'expanded' : ''}>
            <td><button onClick={()=>setExpanded(!expanded)}>Expand</button></td>
            <th style={{color: project.project_hex_color || 'black'}} title={project.name}>
                <div className={'project'}>{project.name}</div>
            </th>
            <th style={{color: project.project_hex_color || 'black'}} title={project.client}>
                <div className={'company'}>{project.client}</div>
            </th>
            {dates.map((date, index)=>{
                const projectDate = project.dateHash[date.format('YYYYMMDD')];

                return (<SingleCalendarCell key={index} text={getText(projectDate, displayType)}/>);
            })}
            <th style={{color: project.project_hex_color || 'black'}}>{getSum(displayType)}</th>
        </tr>
    )
})

const SingleCalendarCell = ({text}: {text?: string | React.ReactElement | React.ReactElement[]})=>{
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
            <button onClick={copyToClipboard}>
                {text}
            </button>
        </td>)
}