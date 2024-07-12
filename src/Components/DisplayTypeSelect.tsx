import {observer} from "mobx-react";
import React from "react";

export const DisplayTypeSelect = observer(({displayType, setDisplayType}: { displayType: string, setDisplayType: Function }) => {

    function setValue(value: any) {
        setDisplayType(value)
        window.localStorage.setItem('displayType', value);
    }

    return <div style={{display: 'flex'}}>
        <DisplayTypeButton name={"Time"} currentValue={displayType} value={'time'} setValue={setValue}/>
        <DisplayTypeButton name={"Rounded Time"} currentValue={displayType} value={'roundedTime'} setValue={setValue}/>
        <DisplayTypeButton name={"Description"} currentValue={displayType} value={'description'} setValue={setValue}/>
        <DisplayTypeButton name={"Time & Description"} currentValue={displayType} value={'tasksAndTime'} setValue={setValue}/>
    </div>
})

const DisplayTypeButton = observer(({name, currentValue, value, setValue}:
                                        {name: string, currentValue: string, value: string, setValue: Function})=>{
    return (
        <button
            className={`calendarHeaderButton ${value === currentValue ? 'selected' : ''}`}
            onClick={()=>setValue(value)}
        >
            {name}
        </button>
    )
})