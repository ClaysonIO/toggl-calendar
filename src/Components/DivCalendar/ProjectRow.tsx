import React, {useState} from 'react';
import {observer} from "mobx-react-lite";
import {Project} from "../../Utilities/Project";
import {Dayjs} from "dayjs";
import {Cell} from "./Cell";
import {ExpandButton} from "../ExpandButton";
import {DecimalToDisplayType} from "../../Utilities/Functions/DecimalToDisplayType";
import {TagRow} from "./TagRow";
import Popup from "reactjs-popup";
import Creatable from "react-select/creatable";

export const ProjectRow = observer(({project, dates, displayType, gridCols, isDragging}: {project: Project, dates: Dayjs[], displayType: string, gridCols: string, isDragging: boolean})=>{
    const [open, setOpen] = useState(false);



    return (
        <div className={'rowContainer'}
             style={{
                 boxShadow: `${isDragging || open ? '0 2px .8rem' : "0 0 0"} ${project.color}`
             }}>
            <div
                className={`row projectRow ${isDragging ? 'selected' : ''}`}
                style={{
                    gridTemplateColumns: gridCols,
                    borderColor: project.color,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderTopColor: project.color,
                    borderLeftColor: open ? project.color : "rgba(0,0,0,0)",
                    borderRightColor: open ? project.color : "rgba(0,0,0,0)",
                    borderBottomColor: open ? project.color : "rgba(0,0,0,0)",
                }}>
                <ExpandButton expanded={project.expanded} setExpanded={project.setExpanded}/>
                <div className={'title'} style={{color: project.color}}>{project.name}</div>
                <div className={'title'} style={{color: project.color}}>{project.client}</div>
                {dates.map((val, index)=>(<Cell key={index} expanded={project.expanded} displayType={displayType} day={project.dateHash[val.format('YYYYMMDD')]}/>))}
                <div className={'title sumCol'} style={{color: project.color}}>{DecimalToDisplayType(project.timeAsHours(dates[0]?.toISOString(), dates[dates.length -1]?.toISOString()), displayType)}</div>
                <Popup
                    onOpen={()=>setOpen(true)}
                    onClose={()=>setOpen(false)}
                    trigger={<button>Menu</button>} position={"left center"}>
                    <div style={{
                        backgroundColor: '#fff',
                        border: `1px solid ${project.color}`,
                        padding: '10px',
                        width: '200px',
                        boxShadow: `0 2px .8rem ${project.color}`
                    }}>
                        Add to Group
                        <Creatable/>
                    </div>
                </Popup>

            </div>
            {project.expanded ?
                project.tags.map((tag, index)=>{
                    return (<TagRow key={index} tag={tag} dates={dates} displayType={displayType} gridCols={gridCols}/>)
                })
                : <React.Fragment/>}
        </div>
    )
})