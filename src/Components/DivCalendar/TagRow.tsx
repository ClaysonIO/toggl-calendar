import React from 'react';
import {observer} from "mobx-react-lite";
import {Tag} from "../../Utilities/Tag";

export const TagRow = observer(({tag}: {tag: Tag})=>{
    return (
        <div className={"row"} style={{gridTemplateColumns: "40px 150px 100px repeat(7, 1fr) 75px;"}}>

            <div></div>
        </div>
    )
})