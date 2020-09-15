import React from 'react';
import {observer} from "mobx-react-lite";
import Creatable from "react-select/creatable";
import Popup from "reactjs-popup";
import {Tag} from "../../Utilities/Tag";

export const TagMenu = observer(({tag, setOpen}: {tag: Tag, setOpen: Function})=>{

    return (<Popup
        onOpen={()=>setOpen(true)}
        onClose={()=>setOpen(false)}
        trigger={<div>
            <button className={'menuButton'}>&#9679;&#9679;&#9679;</button>
        </div>} position={"left center"}>
        <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${tag.color}`,
            padding: '10px',
            width: '200px',
            boxShadow: `0 2px .8rem ${tag.color}`
        }}>
            Set Emails
            <Creatable
                placeholder={"Select or Create New"}
                isMulti={true}
                value={tag.emails.map(val=>({value: val, label: val}))}
                options={tag.workSpace.emails.map(val=>({value: val, label: val}))}
                onCreateOption={tag.createEmail}
                //@ts-ignore
                onChange={(item)=>tag.setEmails((item || []).map(val=>val.value))}
            />
        </div>
    </Popup>)
})