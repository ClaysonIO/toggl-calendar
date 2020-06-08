import {observer} from "mobx-react-lite";
import Select from "react-select";
import React from "react";

export const DisplayTypeSelect = observer(({displayType, setDisplayType}: { displayType: string, setDisplayType: Function }) => {

    const options = [
        {label: "Description", value: 'description'},
        {label: "Time", value: 'time'},
        {label: "Rounded To 15 Min", value: 'roundedTime'}
    ];

    function setValue(value: any) {
        setDisplayType(value?.value)
        window.localStorage.setItem('displayType', value?.value);
    }

    return (
        <div style={{width: "200px"}}>
            <Select
                options={options}
                value={options.find(val => val.value === displayType)}
                onChange={setValue}/>
        </div>
    )
})