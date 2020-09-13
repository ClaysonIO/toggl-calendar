import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";
import Creatable from "react-select/creatable";
import Popup from "reactjs-popup";

export const GroupMenu = observer(({group, setOpen}: {group: Group, setOpen: Function})=>{
    return (<Popup
        onOpen={()=>setOpen(true)}
        onClose={()=>setOpen(false)}
        trigger={<button>Menu</button>} position={"left center"}>
        <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${group.color}`,
            padding: '10px',
            width: '200px',
            boxShadow: `0 2px .8rem ${group.color}`
        }}>
            Add to Group
            <Creatable/>
        </div>
    </Popup>)
})