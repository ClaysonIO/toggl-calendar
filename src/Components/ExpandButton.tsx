import React from 'react';
import {observer} from "mobx-react";

export const ExpandButton = observer(({expanded, setExpanded}: {expanded: boolean, setExpanded: Function})=>{
    return <button className={'expander'} onClick={() => setExpanded(!expanded)}>
        <div className={`rotater ${expanded ? "rotated" : ""}`}>
            &#9654;
        </div>
    </button>
})