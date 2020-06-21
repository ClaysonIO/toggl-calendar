import {observer} from "mobx-react-lite";
import {Project} from "../Utilities/Project";
import {Dayjs} from "dayjs";
import {useLocation} from "react-router-dom";
import React, {useState} from "react";
import {Day} from "../Utilities/Day";
import {Draggable} from "react-beautiful-dnd";
import {CalendarCell} from "./CalendarCell";
import {splitQuery} from "../Utilities/Functions/SplitQuery";

export const CalendarRow = observer(({project, dates, displayType, index}: { project: Project, dates: Dayjs[], displayType: string, index: number }) => {

    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [expanded, setExpanded] = useState(false);

    function getText(projectDate: Day, displayType: string) {
        switch (displayType) {
            case "time":
                return projectDate?.hours.toString();
            case "roundedTime":
                return projectDate?.roundedHours;
            case "description":
                return projectDate?.tasks.filter(val=>val).map((val, index) => (<div key={index}>{val}</div>));
            case "tasksAndTime":
                return projectDate?.tasksAndRoundedTime.filter(val=>val).map((val, index) => (<div key={index}>{val}</div>));
            default:
                return "";
        }
    }

    function getSum(displayType: string) {
        switch (displayType) {
            case "time":
                return project.hours(startDate, endDate);
            case "roundedTime":
                return project.roundedHours(startDate, endDate);
            case "description":
                return project.roundedHours(startDate, endDate);
            default:
                return project.roundedHours(startDate, endDate);
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

                    <td className={'expandCol'}>
                        <button onClick={() => setExpanded(!expanded)}>Expand</button>
                    </td>
                    <th className={'projectCol'} style={{color: project.project_hex_color || 'black'}}
                        title={project.name}>
                        <div className={'project'}>{project.name}</div>
                    </th>
                    <th className={'companyCol'} style={{color: project.project_hex_color || 'black'}}
                        title={project.client}>
                        <div className={'company'}>{project.client}</div>
                    </th>
                    {dates.map((date, index) => {
                        const projectDate = project.dateHash[date.format('YYYYMMDD')];

                        return (<CalendarCell key={index} text={getText(projectDate, displayType)}/>);
                    })}
                    <th className={'sumCol'}
                        style={{color: project.project_hex_color || 'black'}}>{getSum(displayType)}</th>
                </tr>
            )}
        </Draggable>
    )
})