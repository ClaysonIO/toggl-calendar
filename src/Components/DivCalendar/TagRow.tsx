import React from 'react';
import {observer} from "mobx-react-lite";
import {Tag} from "../../Utilities/Tag";

export const TagRow = observer(({tag, gridCols}: {tag: Tag, gridCols: string})=>{
    return (
        <div className={"row"} style={{gridTemplateColumns: gridCols}}>

            <div></div>
        </div>
    )
})