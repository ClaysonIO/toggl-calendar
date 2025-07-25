import React, {useEffect, useState, useMemo} from "react";
import {Layout} from "../Components/Layout";
import {appState} from "../App";
import {useLocation} from "react-router";
import dayjs, {Dayjs} from "dayjs";
import {splitQuery} from "../Utilities/Functions/SplitQuery";
import {DisplayTypeSelect} from "../Components/DisplayTypeSelect";
import {CalendarDateNav} from "../Components/CalendarDateNav";
import {EmailList} from "../Components/EmailList";
import {Tree, NodeModel} from "@minoru/react-dnd-treeview";
import {observer} from "mobx-react";
import {DecimalToDisplayType} from "../Utilities/Functions/DecimalToDisplayType";
import {Project} from "../Utilities/Project";
import {Tag} from "../Utilities/Tag";
import {HeaderDate} from "../Components/DivCalendar/HeaderDate";
import {Loading} from "../Components/Loading";
import {NoContent} from "../Components/NoContent";
import "./TreeView.css";

interface TreeNodeData {
    text: string;
    client?: string;
    color: string;
    timeData: {[date: string]: number};
    totalTime: number;
    type: 'customer' | 'project' | 'tag';
    originalData?: Project | Tag;
}

const TreeViewPage = observer(() => {
    const location = useLocation();
    const {startDate, endDate} = splitQuery(location.search);
    
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>(
        window.localStorage.getItem('displayType') as any || 'time'
    );

    const dates: Dayjs[] = [];
    if(startDate && endDate){
        let startPoint = dayjs(startDate);
        while(startPoint.isBefore(dayjs(endDate), 'day') || startPoint.isSame(dayjs(endDate), 'day')){
            dates.push(startPoint);
            startPoint = startPoint.add(1, 'day');
        }
    }

    const workspace_id = appState.selectedWorkSpace?.id;
    useEffect(()=>{
        if(appState.selectedWorkSpace && startDate && endDate){
            appState.selectedWorkSpace
                .getTasks(dayjs(startDate), dayjs(endDate))
                .catch(err=>{
                    alert(err);
                    console.error(err)
                });
        }
    }, [workspace_id, startDate, endDate]);

    // Transform project data into tree structure
    const treeData: NodeModel<TreeNodeData>[] = useMemo(() => {
        if (!appState.selectedWorkSpace || !startDate || !endDate || !appState.selectedWorkSpace.projects.length) return [];

        const clientMap = new Map<string, {
            projects: Project[];
            timeData: {[date: string]: number};
            totalTime: number;
        }>();

        // Group projects by client
        appState.selectedWorkSpace.projects.forEach(project => {
            const client = project.client || 'No Client';
            if (!clientMap.has(client)) {
                clientMap.set(client, {
                    projects: [],
                    timeData: {},
                    totalTime: 0
                });
            }
            clientMap.get(client)!.projects.push(project);
        });

        const nodes: NodeModel<TreeNodeData>[] = [];
        let nodeId = 1;

        clientMap.forEach((clientData, clientName) => {
            // Calculate client totals
            const clientTimeData: {[date: string]: number} = {};
            let clientTotalTime = 0;

            clientData.projects.forEach(project => {
                dates.forEach(date => {
                    const dateStr = date.format('YYYYMMDD');
                    const dayData = project.dateHash[dateStr];
                    const dayTime = dayData ? dayData.timeAsHours : 0;
                    
                    if (!clientTimeData[dateStr]) clientTimeData[dateStr] = 0;
                    clientTimeData[dateStr] += dayTime;
                });
                clientTotalTime += project.timeAsHours(startDate, endDate);
            });

            const clientId = nodeId++;
            
            // Add client node
            nodes.push({
                id: clientId,
                parent: 0,
                droppable: true,
                text: clientName,
                data: {
                    text: clientName,
                    color: '#333',
                    timeData: clientTimeData,
                    totalTime: clientTotalTime,
                    type: 'customer'
                }
            });

            // Add project nodes under client
            clientData.projects.forEach(project => {
                const projectTimeData: {[date: string]: number} = {};
                dates.forEach(date => {
                    const dateStr = date.format('YYYYMMDD');
                    const dayData = project.dateHash[dateStr];
                    projectTimeData[dateStr] = dayData ? dayData.timeAsHours : 0;
                });

                const projectId = nodeId++;
                nodes.push({
                    id: projectId,
                    parent: clientId,
                    droppable: project.tags.length > 0,
                    text: project.name,
                    data: {
                        text: project.name,
                        client: project.client,
                        color: project.color,
                        timeData: projectTimeData,
                        totalTime: project.timeAsHours(startDate, endDate),
                        type: 'project',
                        originalData: project
                    }
                });

                // Add tag nodes under project (if any)
                project.tags.forEach(tag => {
                    const tagTimeData: {[date: string]: number} = {};
                    dates.forEach(date => {
                        const dateStr = date.format('YYYYMMDD');
                        const dayData = tag.dateHash[dateStr];
                        tagTimeData[dateStr] = dayData ? dayData.timeAsHours : 0;
                    });

                    const tagId = nodeId++;
                    nodes.push({
                        id: tagId,
                        parent: projectId,
                        droppable: false,
                        text: tag.name || '--Untagged--',
                        data: {
                            text: tag.name || '--Untagged--',
                            color: project.color,
                            timeData: tagTimeData,
                            totalTime: tag.timeAsHours(startDate, endDate),
                            type: 'tag',
                            originalData: tag
                        }
                    });
                });
            });
        });

        return nodes;
    }, [appState.selectedWorkSpace?.projects, startDate, endDate, dates]);

    const gridCols = `40px 200px 150px repeat(${dates.length}, 1fr) 100px`;

    const CustomNode = ({ node, depth, isOpen, onToggle }: any) => {
        const data = node.data as TreeNodeData;
        const indent = depth * 20;

        return (
            <div 
                className={`tree-node tree-node-${data.type}`} 
                style={{ 
                    gridTemplateColumns: gridCols,
                    borderLeftColor: data.color,
                    color: data.color
                }}
            >
                <div className="tree-expand-cell" style={{ paddingLeft: `${indent}px` }}>
                    {node.droppable && (
                        <button 
                            className="tree-expand-button"
                            onClick={onToggle}
                            style={{ color: data.color }}
                        >
                            {isOpen ? '▼' : '▶'}
                        </button>
                    )}
                </div>
                <div className="tree-node-text" style={{ color: data.color }}>
                    {data.text}
                </div>
                <div className="tree-node-client" style={{ color: data.color }}>
                    {data.type === 'project' ? data.client : ''}
                </div>
                
                {/* Date columns */}
                {dates.map(date => {
                    const dateStr = date.format('YYYYMMDD');
                    const timeValue = data.timeData[dateStr] || 0;
                    return (
                        <div key={dateStr} className="tree-date-cell">
                            {timeValue > 0 ? DecimalToDisplayType(timeValue, displayType) : ''}
                        </div>
                    );
                })}
                
                {/* Total time column */}
                <div className="tree-total-cell" style={{ color: data.color }}>
                    {DecimalToDisplayType(data.totalTime, displayType)}
                </div>
            </div>
        );
    };

    const handleDrop = (newTreeData: NodeModel<TreeNodeData>[]) => {
        // Handle reordering if needed
        console.log('Tree reordered:', newTreeData);
    };

    return (
        <Layout>
            <h2>Tree View</h2>

            <div style={{display: 'flex', marginBottom: '20px'}}>
                <DisplayTypeSelect displayType={displayType} setDisplayType={setDisplayType}/>
                <div style={{flex: 1}}/>
                <CalendarDateNav/>
            </div>

            {appState.selectedWorkSpace ? (
                <div className="tree-container">
                    {/* Header */}
                    <div className="tree-header" style={{ gridTemplateColumns: gridCols }}>
                        <div></div>
                        <div className="tree-header-project">Project</div>
                        <div className="tree-header-company">Company</div>
                        {dates.map(date => (
                            <HeaderDate key={date.format('YYYYMMDD')} date={date} />
                        ))}
                        <div className="tree-header-sum">Sum of Time</div>
                    </div>

                    {/* Tree */}
                    <div className="tree-content">
                        {appState.selectedWorkSpace.loading ? (
                            <div className="tree-loading">
                                <Loading />
                            </div>
                        ) : treeData.length > 0 ? (
                            <Tree
                                tree={treeData}
                                rootId={0}
                                render={(node, { depth, isOpen, onToggle }) => (
                                    <CustomNode 
                                        node={node} 
                                        depth={depth} 
                                        isOpen={isOpen} 
                                        onToggle={onToggle} 
                                    />
                                )}
                                onDrop={handleDrop}
                                classes={{
                                    root: "tree-root",
                                    container: "tree-container-inner",
                                    dropTarget: "tree-drop-target"
                                }}
                            />
                        ) : (
                            <NoContent />
                        )}
                    </div>
                </div>
            ) : (
                <div>No workspace selected</div>
            )}

            {appState.selectedWorkSpace && appState.selectedWorkSpace.emails.length ? (
                <EmailList workSpace={appState.selectedWorkSpace} startDate={startDate} endDate={endDate}/>
            ) : (
                <React.Fragment/>
            )}
        </Layout>
    );
});

export { TreeViewPage };