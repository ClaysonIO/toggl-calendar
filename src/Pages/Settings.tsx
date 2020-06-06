import React from 'react';
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {observer} from "mobx-react-lite";

export const SettingsPage = observer(()=>{

    return (
        <Layout>
            <h2>Settings</h2>
            <section style={{display: "flex", flexDirection: "column"}}>
                <label htmlFor={"apiToken"}><h3>Toggl API Token</h3></label>
                <input id={'apiToken'} placeholder={"Put your token here..."} type={'password'} value={appState.settings.apiToken} onChange={(e)=>{appState.settings.setApiToken(e.currentTarget.value)}}/>
                <small>Find your API token at the bottom of <a href={'https://toggl.com/app/profile'} rel="noopener noreferrer" target={"_blank"}>toggl.com/app/profile</a> </small>
            </section>
            <section style={{marginTop: "50px"}}>
                <div style={{display: 'flex'}}>
                    <h3 style={{flex: 1}}>Toggl Workspaces</h3>
                    <button onClick={appState.getWorkSpaces} disabled={!appState.settings.apiToken}>Fetch Workspaces</button>
                </div>
                <hr/>

                {appState.workSpaces.length ?
                    <ul>
                        {appState.workSpaces.map((val, index) => (<li key={index}>{val.name}</li>))}
                    </ul>
                    :
                    <h4 style={{textAlign: 'center'}}>- No Workspaces Retrieved - </h4>
                }

            </section>
        </Layout>
    )
})