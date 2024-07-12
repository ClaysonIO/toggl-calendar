import React from 'react';
import {observer} from "mobx-react";
import {WorkSpace} from "../Utilities/WorkSpace";
import {Row} from "../Utilities/Row";
import {Project} from "../Utilities/Project";
import {Tag} from "../Utilities/Tag";
import {Group} from "../Utilities/Group";

export const EmailList = observer(({workSpace, startDate, endDate}: {workSpace: WorkSpace, startDate: string, endDate: string})=>{

    return (<div>
        <hr/>

        <h3>Emails</h3>
        <table style={{width: '100%'}}>
            <thead>
            <tr>
                <th style={{width: '20rem'}}>Email</th>
                <th>Projects</th>
                <th style={{width: '300px', textAlign: "right"}}>Email Types</th>
            </tr>
            </thead>

            <tbody>
            {workSpace.emailRows
                .filter(val=>val.rows.length)
                .map((val, index)=>(<EmailRow key={index}
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
    const projects = rows.reduce((acc: Project[], row)=>{
        if(row instanceof Project) return acc.concat([row])
        if(row instanceof Tag) return acc.concat([row.project])
        if(row instanceof Group) return acc.concat(row.projects)

        return acc;
    }, [])

    const addressee = email.split('@').shift()?.split('.').shift();

    const bodyStart = `Hi ${addressee}, %0A%0A`

    const subject = `Timekeeping: ${projects.map(val=>`${val.client} ${val.name}`.trim()).join(', ')}`;
    const timeBody = rows.map(val=>`${val.name} (${val.roundedHours(startDate, endDate)})`).join("%0A");
    const timeAndTaskBody = rows.map(val=>{
        return [`${val.name} (${val.roundedHours(startDate, endDate)})`].concat(val.tasks(startDate, endDate).map(val=>`     ${val}`)).join("%0A");
    }).join("%0A");

    return (
        <tr>
            <td>{email}</td>
            <td>{rows.map(val=>(<div className={'emailProject'} style={{color: val.color}}>({val.roundedHours(startDate, endDate)}) {val?.name}</div>))}</td>
            <td>
                <div style={{display: 'flex', justifyContent: 'flex-end'}}>

                    <a href={`mailto:${email}?subject=${subject}&body=${bodyStart + timeBody}`} target={'_blank'} rel={"noopener noreferrer"}>
                        <button className={'calendarHeaderButton '}>Time</button>
                    </a>
                    <a href={`mailto:${email}?subject=${subject}&body=${bodyStart + timeAndTaskBody}`} target={'_blank'} rel={"noopener noreferrer"}>
                        <button className={'calendarHeaderButton '}>Time and Description</button>
                    </a>
                </div>
            </td>
        </tr>)
})