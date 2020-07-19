import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";

export const GroupRow = observer(({group, gridCols}: {group: Group, gridCols: string})=>{
    return (
        <div className={"row"} style={{gridTemplateColumns: gridCols}}>

            <div></div>
        </div>
    )
})