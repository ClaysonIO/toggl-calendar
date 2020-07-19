import React from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Draggable} from "react-beautiful-dnd";
import {ProjectRow} from "./ProjectRow";

export const ProjectRowDraggable = observer(({project, dates, displayType, gridCols, index}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string, index: number})=>{

    return (
        <Draggable
            key={project?.pid?.toString()}
            draggableId={project?.pid?.toString()}
            index={index}
        >
            {(provided, snapshot) => (
                <div
                    id={project?.rowId}
                    ref={provided.innerRef}
                    className={`rowContainer ${snapshot.isDragging ? 'selected' : ''}`}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >
                    <ProjectRow project={project} dates={dates} displayType={displayType} gridCols={gridCols} isDragging={snapshot.isDragging}/>
                </div>
            )}
        </Draggable>
    )
})