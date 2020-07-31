import {observer} from "mobx-react-lite";
import {Dayjs} from "dayjs";
import {useLocation} from "react-router-dom";
import React, {useState} from "react";
import {Day} from "../Utilities/Day";
import {CalendarCell} from "./CalendarCell";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {Tag} from "../Utilities/Tag";
import {ExpandButton} from "./ExpandButton";

export const CalendarTagRow = observer(({tag, dates, displayType, index}: { tag: Tag, dates: Dayjs[], displayType: string, index: number }) => {

    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    const [expanded, setExpanded] = useState(false);

    function changeSetExpanded(state: boolean){
        setExpanded(state);
        tag.setExpanded(state);
    }

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
                return tag.hours(startDate, endDate);
            case "roundedTime":
                return tag.roundedHours(startDate, endDate);
            case "description":
                return tag.roundedHours(startDate, endDate);
            default:
                return tag.roundedHours(startDate, endDate);
        }
    }

    return (
        <tr
            id={tag.rowId}
            className={`row ${expanded ? 'expanded' : ''}`}
            style={{borderTop: `1px dashed ${tag.project.color || 'black'}`}}
        >

            <td className={'expandCol'}>
            </td>
            <th className={'projectCol'}>
                <ExpandButton setExpanded={changeSetExpanded} expanded={expanded}/>
            </th>
            <th className={'companyCol'} style={{fontSize: "small", color: tag.project.color || 'black'}}
                title={tag.name}>
                <div className={'project'}>{tag.name || "--Untagged--"}</div>
            </th>
            {dates.map((date, index) => {
                const tagDate = tag.dateHash[date.format('YYYYMMDD')];
                return (<CalendarCell key={index} text={getText(tagDate, displayType)}/>);
            })}
            <th className={'sumCol'}
                style={{color: tag.project.color || 'black'}}>{getSum(displayType)}</th>
        </tr>
    )
})