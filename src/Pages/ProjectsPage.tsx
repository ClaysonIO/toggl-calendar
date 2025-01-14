import React, {useState} from "react";
import {useParams} from "react-router";
import {Layout} from "../Components/Layout";
import {useTogglUser} from "../Utilities/useTogglUser";
import {useTogglDetails} from "../Utilities/useTogglDetails";
import {useSelectedWorkspace_id} from "../Utilities/useSelectedWorkspace";
import {Link} from "react-router-dom";
import dayjs from "dayjs";
import {useTogglProjects} from "../Utilities/useTogglProjects";
import {AgGridReact} from 'ag-grid-react';
import {AllCommunityModule, ModuleRegistry} from 'ag-grid-community';
import {IMergedProjectWeek, IProjectWeek} from "../Utilities/Interfaces/IProjectWeek";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {ButtonGroup} from "@mui/material";
import {ISingleProjectTasks} from "../Utilities/Interfaces/ISingleProjectTasks";
import {DecimalToClockTime} from "../Utilities/Functions/DecimalToClockTime";
import {DecimalToRoundedTime} from "../Utilities/Functions/DecimalToRoundedTime";

ModuleRegistry.registerModules([AllCommunityModule]);

export function ProjectsPage() {
    const {startDate, endDate} = useParams() as { startDate: string, endDate: string };
    const {workspace_id} = useSelectedWorkspace_id();

    const {data: user} = useTogglUser();
    const {data: entries, simpleData: simpleProjects} = useTogglDetails(workspace_id, startDate, endDate);
    const {data: projects} = useTogglProjects({workspace_id});

    const datesArray = Array.from({length: dayjs(endDate).diff(dayjs(startDate), 'day') + 1}, (_, i) => dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'))

    const rowData: IMergedProjectWeek[] = (projects?.map(project => ({
        id: project.id,
        project: project,
        projectWeek: undefined,
        details: simpleProjects?.[project.id] || {} as ISingleProjectTasks,
    })) ?? [])
        .filter(project => !!project.details?.dates && Object.keys(project.details?.dates).length > 0)

    const [viewType, setViewType] = useState<'rounded' | 'actual' | 'description'>('rounded')

    const columns: GridColDef<IMergedProjectWeek>[] = [
        {
            field: 'project.name', headerName: 'Project', flex: 1,
            renderCell: ({row, value}) => (<div style={{color: row.project?.color, fontWeight: 'bold'}}>{value}</div>),
            valueGetter: (value, row) => row.project?.name
        },
        {
            field: 'project.client', headerName: 'Client', flex: 1,
            renderCell: ({row, value}) => (<div style={{color: row.project?.color, fontWeight: 'bold'}}>{value}</div>),
            valueGetter: (value, row) => row.project?.client_name
        },
        ...datesArray.map(date => ({
                field: date,
                width: 75,
                headerName: dayjs(date).format('ddd'),
                valueGetter: (value, row) => {
                    switch (viewType) {
                        case 'rounded':
                            return row.details?.dates?.[date]?.roundedHours || 0
                        case 'description':
                            return Array.from(row.details?.dates?.[date]?.taskDescriptions ?? []).join(', ') || ''
                        case 'actual':
                            return row.details?.dates?.[date]?.hours || 0
                    }
                },
                renderCell: ({value}) => {
                    if(value === 0) return <div/>
                    let simpleValue = value;
                    if (viewType === 'actual') {
                        simpleValue = DecimalToClockTime(value)
                    }
                    return (
                        <button
                            style={{
                                cursor: 'pointer',
                                backgroundColor: 'inherit',
                                border: "none",
                                height: '100%',
                                width: '100%',
                                overflow: 'hidden'
                            }}
                            onClick={() => navigator.clipboard.writeText(value.toString())}
                        >{simpleValue}</button>)
                },
            }

        )) as GridColDef<IMergedProjectWeek>[],
        {
            headerName: 'Total',
            field: 'total',
            width: 75,
            valueGetter: (value, row) => {
                switch (viewType) {
                    case 'rounded':
                        return +DecimalToRoundedTime(Object.values(row.details?.dates ?? {}).reduce((acc, val) => acc + val.hours, 0))
                    case 'description':
                        return +DecimalToRoundedTime(Object.values(row.details?.dates ?? {}).reduce((acc, val) => acc + val.hours, 0))
                    case 'actual':
                        return Object.values(row.details?.dates ?? {}).reduce((acc, val) => acc + val.hours, 0)
                }
            },
            renderCell: ({row, value}) => {
                if(value === 0) return <div/>
                let simpleValue = value;
                if (viewType === 'actual') {
                    simpleValue = DecimalToClockTime(value)
                }
                return (
                    <button
                        style={{
                            cursor: 'pointer',
                            backgroundColor: 'inherit',
                            border: "none",
                            height: '100%',
                            width: '100%',
                            overflow: 'hidden'
                        }}
                        onClick={async () => {
                            for(let singleDate of Object.values(row.details?.dates ?? {})){
                                switch(viewType){
                                    case 'rounded':
                                        await navigator.clipboard.writeText(DecimalToRoundedTime(singleDate.hours))
                                        break;
                                    case 'actual':
                                        await navigator.clipboard.writeText(singleDate.hours.toString())
                                        break;
                                    case 'description':
                                        await navigator.clipboard.writeText(Array.from(singleDate.taskDescriptions).join(', '))
                                        break;
                                }
                            }
                        }}
                    >{simpleValue}</button>)
            },
        },
        {
            headerName: 'Target',
            field: 'target',
            width: 75,
            valueGetter: (value, row) => row.projectWeek?.targetHours
        }
    ]


    return (
        <Layout>
            <h2>Projects</h2>

            <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div>
                <Link
                    to={`/projects/${dayjs(startDate, 'YYYY-MM-DD').subtract(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate, 'YYYY-MM-DD').subtract(1, 'week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>&lt;</button>
                </Link>
                <Link
                    to={`/projects/${dayjs().startOf('week').format('YYYY-MM-DD')}/${dayjs().endOf('week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>Today</button>
                </Link>
                <Link
                    to={`/projects/${dayjs(startDate, 'YYYY-MM-DD').add(1, 'week').format('YYYY-MM-DD')}/${dayjs(endDate, 'YYYY-MM-DD').add(1, 'week').format('YYYY-MM-DD')}`}>
                    <button className={'calendarHeaderButton'}>&gt;</button>
                </Link>
            </div>

                <div style={{fontWeight: 'bold', fontSize: '1.2em'}}>
                    {dayjs(startDate, 'YYYY-MM-DD').toDate().toLocaleDateString()} - {dayjs(endDate, 'YYYY-MM-DD').toDate().toLocaleDateString()}
                </div>
            <div>
                <button onClick={() => setViewType('rounded')} className={'calendarHeaderButton'}>Rounded</button>
                <button onClick={() => setViewType('actual')} className={'calendarHeaderButton'}>Actual</button>
                <button onClick={() => setViewType('description')} className={'calendarHeaderButton'}>Descriptions
                </button>
            </div>
            </div>


            <div style={{flex: 1, minHeight: '500px'}}>
                <DataGrid
                    rows={rowData}
                    columns={columns}
                    density={'compact'}
                />

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr repeat(9, 75px)',
                    minHeight: '1em'
                }}>
                    <div></div>
                    <div></div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>
                    <div style={{backgroundColor: 'grey'}}>

                    </div>

                </div>
            </div>


        </Layout>
    )
}