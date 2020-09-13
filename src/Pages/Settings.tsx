import React from 'react';
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {observer} from "mobx-react-lite";
import {WorkSpace} from "../Utilities/WorkSpace";
import {useHistory} from "react-router";

export const SettingsPage = observer(()=>{

    const history = useHistory();

    function selectWorkSpace(workSpace?: WorkSpace){
        appState.selectWorkSpace(workSpace);
        history.push(`/calendar`);
    }

    return (
        <Layout>
            <h2>Settings</h2>
            <section style={{display: "flex", flexDirection: "column"}}>
                <label htmlFor={"apiToken"}><h3>Toggl API Token</h3></label>
                <div style={{display: 'flex'}}>
                    <input
                        id={'apiToken'}
                        style={{flex: 1}}
                        placeholder={"Put your token here..."}
                        type={'password'}
                        value={appState.settings.apiToken}
                        onChange={(e)=>{appState.settings.setApiToken(e.currentTarget.value)}}
                        onBlur={appState.getWorkSpaces}
                    />
                    <button onClick={appState.getWorkSpaces} disabled={!appState.settings.apiToken}>Fetch Workspaces</button>
                </div>
                <small>Find your API token at the bottom of <a href={'https://toggl.com/app/profile'} rel="noopener noreferrer" target={"_blank"}>toggl.com/app/profile</a> </small>
            </section>
            <section style={{marginTop: "50px"}}>
                <div style={{display: 'flex'}}>
                    <h3 style={{flex: 1}}>Toggl Workspaces</h3>
                </div>
                <hr/>

                {appState.workSpaces.length ?
                    <ul>
                        {appState.workSpaces.map((val, index) => (<div key={index} style={{width: '200px', margin: '5px'}}>
                                <button
                                    style={{width: '100%'}}
                                    onClick={()=>selectWorkSpace(val)}
                                    key={index}>{val.name}</button>
                            </div>
                        ))}
                    </ul>
                    :
                    <h4 style={{textAlign: 'center'}}>- No Workspaces Retrieved - </h4>
                }

            </section>
        </Layout>
    )
})