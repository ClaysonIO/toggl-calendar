import React from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Draggable} from "react-beautiful-dnd";
import {ProjectRow} from "./ProjectRow";
import {GroupRow} from "./GroupRow";
import {Group} from "../../Utilities/Group";

export const GroupRowDraggable = observer(({group, dates, displayType, gridCols, index}: {group: Group, dates: Dayjs[], displayType: string, gridCols: string, index: number})=>{

    return (
        <Draggable
            key={group?.rowId?.toString()}
            draggableId={group?.rowId?.toString()}
            index={index}
        >
            {(provided, snapshot) => (
                <div
                    id={group?.rowId}
                    ref={provided.innerRef}
                    className={`rowContainer ${snapshot.isDragging ? 'selected' : ''}`}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >
                    <GroupRow group={group} dates={dates} displayType={displayType} gridCols={gridCols} isDragging={snapshot.isDragging}/>
                </div>
            )}
        </Draggable>
    )
})