import React, {useMemo} from 'react';
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";

export const EmailList = observer(({workspace}: {workspace: WorkSpace})=>{

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
            {workspace.emails.map((val, index)=>(<EmailRow key={index} workSpace={workspace} email={val}/>))}
            </tbody>
        </table>
    </div>)
})

const EmailRow = observer(({workSpace, email}: {email: string, workSpace: WorkSpace})=>{
    const emailRows = useMemo(()=>workSpace.getEmailRows(email), []);
    const subject = "Timekeeping Update";
    const body = emailRows.map(val=>val.name).join("%0A");

    return (
        <tr>
            <td>{email}</td>
            <td>{emailRows.map(val=>val?.name).join(', ')}</td>
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