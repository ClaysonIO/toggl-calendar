import React, {ReactElement} from "react";
import {Day} from "../../Utilities/Day";

export const Cell = ({day, displayType, expanded}: { day?: Day, displayType: string, expanded: boolean }) => {
    function copyToClipboard(event: React.MouseEvent) {
        const range = document.createRange();
        const textNode = event.currentTarget;
        if (textNode) {
            range.selectNode(textNode);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            document.execCommand("copy");
        }
    }

    let value: string | ReactElement | ReactElement[] = "";

    if(day){
        switch(displayType){
            case "description": value = day.tasks.map((v, index)=>(<div key={index}>{v}</div>)); break;
            case "time": value = day.hours; break;
            case "roundedTime": value = day.roundedHours; break;
            case "tasksAndTime": value = day.tasksAndRoundedTime.map((v, index)=>(<div key={index}>{v}</div>)); break;
        }
    }

    return (
        <div className={`dateCol ${expanded ? 'expanded' : ''}`}>
            <button onClick={copyToClipboard}>
                {value}
            </button>
        </div>)
}