import React from 'react';
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../../Utilities/WorkSpace";
import {Dayjs} from "dayjs";
import {HeaderRow} from "./HeaderRow";
import "./DivCalendar.css";
import {ProjectRow} from "./ProjectRow";
import {Row} from "../../Utilities/Row";
import {GroupRow} from "./GroupRow";
import {Group} from "../../Utilities/Group";
import {Project} from "../../Utilities/Project";
import {Tag} from "../../Utilities/Tag";
import {TagRow} from "./TagRow";

export const CalendarContainer = observer(({workSpace, dates}: {workSpace: WorkSpace, dates: Dayjs[]})=>{

    const gridTemplateColumns = `40px 150px 100px repeat(${dates.length}, 1fr) 75px`
    return (
        <div className={"divCalendar container"}>
            <HeaderRow dates={dates} gridTemplateColumns={gridTemplateColumns}/>
            {workSpace.orderedProjects.map((val: Row)=>{
                switch (val.type) {
                    case "group": return <GroupRow key={val.rowId} group={val as Group}/>;
                    case "project": return <ProjectRow key={val.rowId} project={val as Project}/>;
                    case "tag": return <TagRow key={val.rowId} tag={val as Tag}/>;
                }
            })}
        </div>
    )
});