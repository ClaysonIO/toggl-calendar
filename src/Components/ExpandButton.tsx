import React from 'react';

export const ExpandButton = ({expanded, setExpanded}: {expanded: boolean, setExpanded: Function})=>{
    return <button className={'expander'} onClick={() => setExpanded(!expanded)}>
        <div className={`rotater ${expanded ? "rotated" : ""}`}>
            &#9654;
        </div>
    </button>
}