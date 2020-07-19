import React from 'react';
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../../Utilities/WorkSpace";
import {Dayjs} from "dayjs";
import {HeaderRow} from "./HeaderRow";
import "./DivCalendar.css";
import {Row} from "../../Utilities/Row";
import {GroupRow} from "./GroupRow";
import {Group} from "../../Utilities/Group";
import {Project} from "../../Utilities/Project";
import {Tag} from "../../Utilities/Tag";
import {TagRow} from "./TagRow";
import {FooterRow} from "./FooterRow";
import {Loading} from "../Loading";
import {DragDropContext, Droppable} from "react-beautiful-dnd";
import {ProjectRowDraggable} from "./ProjectRowDraggable";
import {NoContent} from "../NoContent";

export const CalendarContainer = observer(({workSpace, displayType, dates}: {workSpace: WorkSpace, displayType: string, dates: Dayjs[]})=>{

    const gridCols = `40px 150px 100px repeat(${dates.length}, 1fr) 75px`
    return (
        <div className={"divCalendar container"}>
            <HeaderRow dates={dates} gridCols={gridCols}/>
            {workSpace.loading ? (
                    <div className={'row'}>
                        <div className={'loading'} ><Loading/></div>
                    </div>
                ) :
                <DragDropContext onDragEnd={workSpace.orderProject}>
                    <Droppable droppableId={'calendarContainer'}>
                        {(provided, snapshot) => (
                            <div
                                id={"calendarContainer"}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {workSpace.orderedProjects.length ? workSpace.orderedProjects.map((val: Row, index)=>{
                                    switch (val.type) {
                                        case "group": return <GroupRow key={val.rowId} group={val as Group} dates={dates} displayType={displayType} gridCols={gridCols}/>;
                                        case "project": return <ProjectRowDraggable key={val.rowId} dates={dates} displayType={displayType} project={val as Project} gridCols={gridCols} index={index}/>;
                                        case "tag": return <TagRow key={val.rowId} tag={val as Tag} dates={dates} displayType={displayType} gridCols={gridCols}/>;
                                        default: return <React.Fragment/>
                                    }
                                }) : <NoContent/>}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            }
            <FooterRow dates={dates} rows={workSpace.orderedProjects} gridCols={gridCols} displayType={displayType}/>
        </div>
    )
});