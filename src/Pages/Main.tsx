import React from "react";
import {Layout} from "../Components/Layout";
import { Link } from "react-router-dom";

export const MainPage = ()=>{
    return (
        <Layout>
            <h2>What is Toggl Calendar View?</h2>
            <p>An easy way to get daily information out of Toggl, and into another tool, by streamlining the copy-paste process</p>
            <p>To get started, add your API Token in <Link to={"/settings"}>Settings</Link></p>
        </Layout>
    )
}