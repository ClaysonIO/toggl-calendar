import React from 'react';
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";
import {Row} from "../Utilities/Row";

export const EmailList = observer(({workSpace, startDate, endDate}: {workSpace: WorkSpace, startDate: string, endDate: string})=>{

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
            {workSpace.emailRows.map((val, index)=>(<EmailRow key={index}
                                                              rows={val.rows}
                                                              email={val.email}
                                                              startDate={startDate}
                                                              endDate={endDate}
            />))}
            </tbody>
        </table>
    </div>)
})

const EmailRow = observer(({rows, email, startDate, endDate}: {email: string, rows: Row[], startDate: string, endDate: string})=>{
    const subject = "Timekeeping Update";
    const timeBody = rows.map(val=>`${val.name} (${val.roundedHours(startDate, endDate)})`).join("%0A");
    const timeAndTaskBody = rows.map(val=>{
        return [`${val.name} (${val.roundedHours(startDate, endDate)})`].concat(val.tasks(startDate, endDate).map(val=>`     ${val}`)).join("%0A");
    }).join("%0A");

    return (
        <tr>
            <td>{email}</td>
            <td>{rows.map(val=>val?.name).join(', ')}</td>
            <td>
                <a href={`mailto:${email}?subject=${subject}&body=${timeBody}`} target={'_blank'} rel={"noopener noreferrer"}>
                    <button>Time</button>
                </a>
                <a href={`mailto:${email}?subject=${subject}&body=${timeAndTaskBody}`} target={'_blank'} rel={"noopener noreferrer"}>
                    <button>Time and Description</button>
                </a>
            </td>
        </tr>)
})