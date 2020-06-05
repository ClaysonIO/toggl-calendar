import React from 'react';
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {observer} from "mobx-react-lite";

export const SettingsPage = observer(()=>{

    return (
        <Layout>
            <h2>Settings</h2>
            <div style={{display: "flex", flexDirection: "column"}}>
                <label htmlFor={"apiToken"}><h4>Toggl API Token</h4></label>
                <input id={'apiToken'} placeholder={"Put your token here..."} type={'text'} value={appState.settings.apiToken} onChange={(e)=>{appState.settings.setApiToken(e.currentTarget.value)}}/>
                <small>Find your API token at the bottom of <a href={'https://toggl.com/app/profile'} rel="noopener noreferrer" target={"_blank"}>toggl.com/app/profile</a> </small>
            </div>
            <div style={{marginTop: "50px"}}>
                <h3>Toggl Workspaces</h3>
                <hr/>

                <ul>
                    {appState.workSpaces.map(val=>(<li>{val.name}</li>))}
                </ul>
                <button onClick={appState.getWorkSpaces} disabled={!appState.settings.apiToken}>Fetch Workspaces</button>
            </div>
        </Layout>
    )
})