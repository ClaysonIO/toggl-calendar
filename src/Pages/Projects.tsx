import React from "react";
import { useParams } from "react-router";
import {Layout} from "../Components/Layout";
import {useTogglUser} from "../Utilities/useTogglUser";
import {useTogglDetails} from "../Utilities/useTogglDetails";
import {useSelectedWorkspace_id} from "../Utilities/useSelectedWorkspace";
import {Link} from "react-router-dom";
import dayjs from "dayjs";
import {useTogglProjects} from "../Utilities/useTogglProjects";

export function ProjectsPage(){
    const {startDate, endDate} = useParams() as {startDate: string, endDate: string};
    const {workspace_id} = useSelectedWorkspace_id();

    const {data: user} = useTogglUser();
    const {data: entries} = useTogglDetails(workspace_id, startDate, endDate);
    const {data: projects} = useTogglProjects({workspace_id});

    return (
        <Layout>
            <h2>Projects</h2>

            <div>
                <Link to={`/projects/${dayjs(startDate, 'YYYY-MM-DD').subtract(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate, 'YYYY-MM-DD').subtract(1, 'week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>&lt;</button>
                </Link>
                <Link  to={`/projects/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>Today</button>
                </Link>
                <Link to={`/projects/${dayjs(startDate, 'YYYY-MM-DD').add(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate, 'YYYY-MM-DD').add(1, 'week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>&gt;</button>
                </Link>
            </div>

            {localStorage.getItem('togglApiKey')}

        </Layout>
    )
}