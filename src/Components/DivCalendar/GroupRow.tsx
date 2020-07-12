import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";

export const GroupRow = observer(({group}: {group: Group})=>{
    return (
        <div className={"row"} style={{gridTemplateColumns: "40px 150px 100px repeat(7, 1fr) 75px;"}}>

            <div></div>
        </div>
    )
})