import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";
import {Dayjs} from "dayjs";
import {Loading} from "./Loading";
import {DragDropContext, Droppable} from "react-beautiful-dnd";
import React from "react";
import {CalendarProjectRow} from "./CalendarProjectRow";
import {Project} from "../Utilities/Project";

export const CalendarBody = observer(({workSpace, dates, displayType}: { workSpace: WorkSpace, dates: Dayjs[], displayType: string }) => {

    return workSpace.loading ? (
        <tbody>
        <tr className={'row'}>
            <td className={'loading'} ><Loading/></td>
        </tr>
        </tbody>
    ) : (
        <DragDropContext onDragEnd={workSpace.orderProject}>
            <Droppable droppableId={'tbody'}>
                {(provided, snapshot) => (
                    <tbody
                        id={"tbody"}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                    {workSpace?.orderedProjects.map((val, index) => (
                        <CalendarProjectRow key={index} index={index} project={val as Project} dates={dates} displayType={displayType}/>
                    ))}
                    {provided.placeholder}
                    </tbody>
                )}
            </Droppable>
        </DragDropContext>
    )
})