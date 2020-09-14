import React from 'react';
import {observer} from "mobx-react-lite";
import {Group} from "../../Utilities/Group";
import Popup from "reactjs-popup";

export const GroupMenu = observer(({group, setOpen}: {group: Group, setOpen: Function})=>{
    return (<Popup
        onOpen={()=>setOpen(true)}
        onClose={()=>setOpen(false)}
        trigger={<div>
            <button className={'menuButton'}>&#9679;&#9679;&#9679;</button>
        </div>} position={"left center"}>
        <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${group.color}`,
            padding: '10px',
            width: '200px',
            boxSizing: 'border-box',
            boxShadow: `0 2px .8rem ${group.color}`
        }}>


            <div style={{display: 'flex', flexDirection: 'column'}}>
                <label htmlFor={`name_${group.rowId}`} style={{marginRight: '10px'}}>Name</label>
                <input  name={`name_${group.rowId}`} type={'text'} value={group.name} onChange={(e)=>{group.setName(e.currentTarget.value)}}/>
            </div>

            <div style={{display: 'flex', marginTop: '20px',  flexDirection: 'column'}}>
                <label htmlFor={`color_${group.rowId}`} style={{marginRight: '10px'}}>Set Color</label>
                <input style={{width: '100%'}} name={`color_${group.rowId}`} type={'color'} value={group.color} onChange={(e)=>{group.setColor(e.currentTarget.value)}}/>
            </div>
        </div>
    </Popup>)
})