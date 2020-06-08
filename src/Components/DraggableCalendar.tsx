import React, {useEffect, useState} from "react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {observer} from "mobx-react-lite";
import dayjs, {Dayjs} from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import {Project} from "../Utilities/Project";
import {useHistory, useParams, Link} from "react-router-dom";
import {Day} from "../Utilities/Day";
import './DraggableCalendar.css'
import {Loading} from "./Loading";
import Select from "react-select";
import {DragDropContext, Draggable, Droppable} from "react-beautiful-dnd";

dayjs.extend(customParseFormat)

interface ICalendar{
    workSpace: WorkSpace;
}

export const DraggableCalendar = observer(({workSpace}: ICalendar)=>{
    const {startDate, endDate} = useParams();
    const history = useHistory();
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>(window.localStorage.getItem('displayType') as any || 'time')

    const navLinks = {
        back: `/calendar/${dayjs(startDate).subtract(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).subtract(1, 'week').format('YYYY-MM-DD')}`,
        today:`/calendar/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`,
        forward:`/calendar/${dayjs(startDate).add(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate).add(1, 'week').format('YYYY-MM-DD')}`
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


    return workSpace ? (
        <React.Fragment>
            <div style={{display: 'flex'}}>
                <DisplayTypeSelect displayType={displayType} setDisplayType={setDisplayType}/>
                <div style={{flex: 1}}/>
                <Link to={navLinks.back}><button>&lt;</button></Link>
                <Link to={navLinks.today}><button>Today</button></Link>
                <Link to={navLinks.forward}><button>&gt;</button></Link>
            </div>
            <DragDropContext onDragEnd={workSpace.orderProject}>
                <table className={'draggableCalendar'}>
                    <CalendarHeader dates={dates}/>
                    <CalendarBody dates={dates} workSpace={workSpace} displayType={displayType}/>
                    <CalendarFooter dates={dates} workSpace={workSpace} displayType={displayType}/>
                </table>
            </DragDropContext>
        </React.Fragment>
    ) : (
        <h3>No Workspace Selected</h3>
    )
});

export const DisplayTypeSelect = observer(({displayType, setDisplayType}: {displayType: string, setDisplayType: Function})=>{

    const options = [
        {label: "Description", value: 'description'},
        {label: "Time", value: 'time'},
        {label: "Rounded To 15 Min", value: 'roundedTime'}
    ];

    function setValue(value: any){
        setDisplayType(value?.value)
        window.localStorage.setItem('displayType', value?.value);
    }
    return (
        <div style={{width: "200px"}}>
            <Select
                options={options}
                value={options.find(val=>val.value === displayType)}
                onChange={setValue}/>
        </div>
    )
})

export const CalendarHeader = observer(({dates}: {dates: Dayjs[]})=>{

    return (
        <thead>
        <tr className={'row'}>
            <th className={'expandCol'}/>
            <th className={'projectCol'}>Project</th>
            <th className={'companyCol'}>Company</th>
            {dates.map((val, index)=>(
                <th className={'dateCol'} key={index}>
                    <div>{val.format('dddd')}</div>
                    <div>{val.toDate().toLocaleDateString()}</div>
                </th>))}
            <th className={'sumCol'}>Sum of Time</th>
        </tr>
        </thead>
    )
})

export const CalendarBody = observer(({workSpace, dates, displayType}: {workSpace: WorkSpace, dates: Dayjs[], displayType: string})=>{

    return workSpace.loading ? (
        <tbody><tr><td colSpan={11}><Loading/></td></tr></tbody>
    ) : (
        <Droppable droppableId={'tbody'}>
            {(provided, snapshot) => (
                <tbody
                    id={"tbody"}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                >
                {workSpace?.orderedProjects.slice().map((val, index)=>(
                    <CalendarRow key={index} index={index} project={val} dates={dates} displayType={displayType}/>
                ))}
                {provided.placeholder}
                </tbody>
            )}
        </Droppable>
    )
})
export const CalendarRow = observer(({project, dates, displayType, index}: {project: Project, dates: Dayjs[], displayType: string, index: number})=>{

    const {startDate, endDate} = useParams();
    const [expanded, setExpanded] = useState(false);

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
        <Draggable key={project?.pid?.toString()} draggableId={project?.pid?.toString()} index={index}>
            {(provided, snapshot) => (
                <tr
                    id={project?.pid?.toString() || "blank"}
                    ref={provided.innerRef}
                    className={`row ${expanded ? 'expanded' : ''}`}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >

                    <td className={'expandCol'}><button onClick={()=>setExpanded(!expanded)}>Expand</button></td>
                    <th className={'projectCol'} style={{color: project.project_hex_color || 'black'}} title={project.name}>
                        <div className={'project'}>{project.name}</div>
                    </th>
                    <th className={'companyCol'} style={{color: project.project_hex_color || 'black'}} title={project.client}>
                        <div className={'company'}>{project.client}</div>
                    </th>
                    {dates.map((date, index)=>{
                        const projectDate = project.dateHash[date.format('YYYYMMDD')];

                        return (<SingleCell key={index} text={getText(projectDate, displayType)}/>);
                    })}
                    <th className={'sumCol'} style={{color: project.project_hex_color || 'black'}}>{getSum(displayType)}</th>
                </tr>
            )}
        </Draggable>
    )
})

export const SingleCell = ({text}: {text?: string | React.ReactElement | React.ReactElement[]})=>{
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
        <td className={'dateCol'}>
            <button onClick={copyToClipboard}>
                {text}
            </button>
        </td>)
}


export const CalendarFooter = observer(({dates, displayType, workSpace}: {dates: Dayjs[], displayType: string, workSpace: WorkSpace})=>{


    function getDateSum(date: Dayjs){
        switch(displayType) {
            case "time": return workSpace.sumDayClockTime(date);
            case "roundedTime": return workSpace.sumDayRoundedHours(date);
            case "description": return workSpace.sumDayClockTime(date);
            default: return "";
        }
    }


    function getWeekSum(dates: Dayjs[]){
        const startDate = dates[0];
        const endDate = dates[dates.length-1]

        switch(displayType) {
            case "time": return workSpace.sumWeekClockTime(startDate, endDate);
            case "roundedTime": return workSpace.sumWeekRoundedHours(startDate, endDate);
            case "description": return workSpace.sumWeekClockTime(startDate, endDate);
            default: return "";
        }
    }

    return (
        <tfoot>
        <tr className={'row'}>
            <th/>
            <th/>
            <th/>
            {dates.map((val, index)=>(
                <th className={'dateCol'} key={index}>
                    <div>{getDateSum(val)}</div>
                </th>))}
            <th className={'sumCol'}>
                <div>{getWeekSum(dates)}</div>
            </th>
        </tr>
        </tfoot>
    )
})