import React from 'react';
import {observer} from "mobx-react";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {ProjectRow} from "./ProjectRow";

export const ProjectRowDraggable = observer(({project, dates, displayType, gridCols, index}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string, index: number})=>{

    return (
                <div
                    id={project?.rowId}
                    className={`rowContainer`}
                >
                    <ProjectRow project={project} dates={dates} displayType={displayType} gridCols={gridCols}/>
                </div>
    )
})