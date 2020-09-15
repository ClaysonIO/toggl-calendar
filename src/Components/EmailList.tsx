import React from 'react';
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";
import {Row} from "../Utilities/Row";

export const EmailList = observer(({workSpace}: {workSpace: WorkSpace})=>{

    return (<div>
        <hr/>

        <h3>Emails</h3>
        <table style={{width: '100%'}}>
            <thead>
            <tr>
                <th style={{width: '20rem'}}>Email</th>
                <th>Projects</th>
                <th style={{width: '200px'}}>Email Types</th>
            </tr>
            </thead>

            <tbody>
            {workSpace.emailRows.map((val, index)=>(<EmailRow key={index} rows={val.rows} email={val.email}/>))}
            </tbody>
        </table>
    </div>)
})

const EmailRow = observer(({rows, email}: {email: string, rows: Row[]})=>{
    const subject = "Timekeeping Update";
    const body = rows.map(val=>val.name || '').join("%0A");

    return (
        <tr>
            <td>{email}</td>
            <td>{rows.map(val=>val?.name).join(', ')}</td>
            <td>
                <a href={`mailto:${email}?subject=${subject}&&body=${body}`} target={'_blank'} rel={"noopener noreferrer"}>
                    <button>Time</button>
                </a>
                <a href={`mailto:${email}?subject=${subject}&&body=${body}`} target={'_blank'} rel={"noopener noreferrer"}>
                    <button>Time and Description</button>
                </a>
            </td>
        </tr>)
})