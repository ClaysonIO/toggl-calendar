import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";
import {Dayjs} from "dayjs";
import {Loading} from "./Loading";
import {Droppable} from "react-beautiful-dnd";
import React from "react";
import {CalendarProjectRow} from "./CalendarProjectRow";

export const CalendarBody = observer(({workSpace, dates, displayType}: { workSpace: WorkSpace, dates: Dayjs[], displayType: string }) => {

    return workSpace.loading ? (
        <tbody>
        <tr className={'row'}>
            <td className={'loading'} ><Loading/></td>
        </tr>
        </tbody>
    ) : (
        <Droppable droppableId={'tbody'} isCombineEnabled={true}>
            {(provided, snapshot) => (
                <tbody
                    id={"tbody"}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                >
                {workSpace?.orderedProjects.slice().map((val, index) => (
                    <CalendarProjectRow key={index} index={index} project={val} dates={dates} displayType={displayType}/>
                ))}
                {provided.placeholder}
                </tbody>
            )}
        </Droppable>
    )
})