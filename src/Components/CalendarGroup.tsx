import {observer} from "mobx-react-lite";
import {Dayjs} from "dayjs";
import {useLocation} from "react-router-dom";
import React, {useState} from "react";
import {Day} from "../Utilities/Day";
import {Draggable} from "react-beautiful-dnd";
import {CalendarCell} from "./CalendarCell";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {Group} from "../Utilities/Group";

export const CalendarGroup = observer(({group, dates, displayType, index}: { group: Group, dates: Dayjs[], displayType: string, index: number }) => {

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

    function getSum(displayType: string): any {
        switch (displayType) {
            case "time":
                return group.hours(startDate, endDate);
            case "roundedTime":
                return group.roundedHours(startDate, endDate);
            case "description":
                return group.roundedHours(startDate, endDate);
            default:
                return group.roundedHours(startDate, endDate);
        }
    }

    return (
        <Draggable key={group?.id?.toString()} draggableId={group?.id?.toString()} index={index}>
            {(provided, snapshot) => (
                <tr
                    id={group?.id   ?.toString() || "blank"}
                    ref={provided.innerRef}
                    className={`row ${expanded ? 'expanded' : ''}`}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >

                    <td className={'expandCol'}>
                        <button onClick={() => setExpanded(!expanded)}>Expand</button>
                    </td>
                    <th className={'projectCol'} style={{color: group.project_hex_color || 'black'}}
                        title={group.name}>
                        <div className={'group'}>{group.name}</div>
                    </th>
                    <th className={'companyCol'} style={{color: group.project_hex_color || 'black'}}
                        title={group.client}>
                        <div className={'company'}>{group.client}</div>
                    </th>
                    {dates.map((date, index) => {
                        const projectDate = group.dateHash[date.format('YYYYMMDD')];

                        return (<CalendarCell key={index} text={getText(projectDate, displayType)}/>);
                    })}
                    <th className={'sumCol'}
                        style={{color: group.project_hex_color || 'black'}}>{getSum(displayType)}</th>
                </tr>
            )}
        </Draggable>
    )
})