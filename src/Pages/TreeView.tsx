import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "../Components/Layout";
import { appState } from "../App";
import { useLocation } from "react-router";
import dayjs, { Dayjs } from "dayjs";
import { splitQuery } from "../Utilities/Functions/SplitQuery";
import { DisplayTypeSelect } from "../Components/DisplayTypeSelect";
import { CalendarDateNav } from "../Components/CalendarDateNav";
import { observer } from "mobx-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Tree, NodeModel, TreeMethods } from "@minoru/react-dnd-treeview";
import { TreeNode } from "../Components/TreeView/TreeNode";
import "../Components/TreeView/TreeView.css";
import { Group } from "../Utilities/Group";
import { Project } from "../Utilities/Project";
import { Tag } from "../Utilities/Tag";
import { Loading } from "../Components/Loading";
import { NoContent } from "../Components/NoContent";
import { EmailList } from "../Components/EmailList";

interface TreeNodeData {
    type: 'group' | 'project' | 'tag';
    name: string;
    client?: string;
    color: string;
    dates: Dayjs[];
    displayType: string;
    data: Group | Project | Tag;
}

export const TreeViewPage = observer(() => {
    const location = useLocation();
    const { startDate, endDate } = splitQuery(location.search);
    
    const [displayType, setDisplayType] = useState<'time' | 'description' | 'roundedTime'>(
        window.localStorage.getItem('displayType') as any || 'time'
    );

    const dates: Dayjs[] = [];
    if (startDate && endDate) {
        let startPoint = dayjs(startDate);
        while (startPoint.isBefore(dayjs(endDate), 'day') || startPoint.isSame(dayjs(endDate), 'day')) {
            dates.push(startPoint);
            startPoint = startPoint.add(1, 'day');
        }
    }

    const workspace_id = appState.selectedWorkSpace?.id;
    useEffect(() => {
        if (appState.selectedWorkSpace && startDate && endDate) {
            appState.selectedWorkSpace
                .getTasks(dayjs(startDate), dayjs(endDate))
                .catch(err => {
                    alert(err);
                    console.error(err)
                });
        }
    }, [workspace_id, startDate, endDate]);

    // Convert the workspace data to tree structure
    const treeData = useMemo(() => {
        if (!appState.selectedWorkSpace) return [];

        const nodes: NodeModel<TreeNodeData>[] = [];
        let nodeId = 0;

        // Get all groups and standalone projects
        const groupedProjectIds = new Set<string>();
        const groups = appState.selectedWorkSpace.orderedProjects.filter(row => row?.type === 'group') as Group[];
        
        groups.forEach(group => {
            group.projectIds.forEach(id => groupedProjectIds.add(id));
        });

        // Process groups
        groups.forEach(group => {
            const groupNode: NodeModel<TreeNodeData> = {
                id: `group-${group.rowId}`,
                parent: "0",
                droppable: true,
                text: group.name,
                data: {
                    type: 'group',
                    name: group.name,
                    color: group.color || "#ff8330",
                    dates,
                    displayType,
                    data: group
                }
            };
            nodes.push(groupNode);

            // Add projects under this group
            group.projects.forEach(project => {
                const projectNode: NodeModel<TreeNodeData> = {
                    id: `project-${project.rowId}`,
                    parent: `group-${group.rowId}`,
                    droppable: project.tags.length > 0,
                    text: project.name,
                    data: {
                        type: 'project',
                        name: project.name,
                        client: project.client,
                        color: project.color,
                        dates,
                        displayType,
                        data: project
                    }
                };
                nodes.push(projectNode);

                // Add tags under this project
                project.tags.forEach(tag => {
                    const tagNode: NodeModel<TreeNodeData> = {
                        id: `tag-${tag.rowId}`,
                        parent: `project-${project.rowId}`,
                        droppable: false,
                        text: tag.name || "--Untagged--",
                        data: {
                            type: 'tag',
                            name: tag.name || "--Untagged--",
                            color: project.color,
                            dates,
                            displayType,
                            data: tag
                        }
                    };
                    nodes.push(tagNode);
                });
            });
        });

        // Process standalone projects (not in any group)
        const standaloneProjects = appState.selectedWorkSpace.orderedProjects.filter(
            row => row?.type === 'project' && !groupedProjectIds.has(row.rowId)
        ) as Project[];

        standaloneProjects.forEach(project => {
            const projectNode: NodeModel<TreeNodeData> = {
                id: `project-${project.rowId}`,
                parent: "0",
                droppable: project.tags.length > 0,
                text: project.name,
                data: {
                    type: 'project',
                    name: project.name,
                    client: project.client,
                    color: project.color,
                    dates,
                    displayType,
                    data: project
                }
            };
            nodes.push(projectNode);

            // Add tags under this project
            project.tags.forEach(tag => {
                const tagNode: NodeModel<TreeNodeData> = {
                    id: `tag-${tag.rowId}`,
                    parent: `project-${project.rowId}`,
                    droppable: false,
                    text: tag.name || "--Untagged--",
                    data: {
                        type: 'tag',
                        name: tag.name || "--Untagged--",
                        color: project.color,
                        dates,
                        displayType,
                        data: tag
                    }
                };
                nodes.push(tagNode);
            });
        });

        return nodes;
    }, [appState.selectedWorkSpace, dates, displayType, appState.selectedWorkSpace?.orderedProjects]);

    return (
        <Layout>
            <h2>Tree View</h2>

            <div style={{ display: 'flex', marginBottom: '20px' }}>
                <DisplayTypeSelect displayType={displayType} setDisplayType={setDisplayType} />
                <div style={{ flex: 1 }} />
                <CalendarDateNav />
            </div>

            {appState.selectedWorkSpace ? (
                <DndProvider backend={HTML5Backend}>
                    <div className="treeview-container">
                        {/* Header row */}
                        <div className="treeview-header" style={{
                            gridTemplateColumns: `40px 150px 100px repeat(${dates.length}, 1fr) 75px`
                        }}>
                            <div/>
                            <div>Project</div>
                            <div>Company</div>
                            {dates.map((date, index) => (
                                <div key={index} style={{ overflow: "hidden" }}>
                                    <div>{date.format('dddd')}</div>
                                    <div>{date.format('MMM D')}</div>
                                </div>
                            ))}
                            <div className='sumCol'>Sum of Time</div>
                        </div>
                        
                        {appState.selectedWorkSpace.loading ? (
                            <div className='loading' style={{ textAlign: 'center', padding: '50px' }}>
                                <Loading />
                            </div>
                        ) : treeData.length > 0 ? (
                            <Tree
                                tree={treeData}
                                rootId={"0"}
                                render={(node, { depth, isOpen, onToggle }) => (
                                    <TreeNode
                                        node={node}
                                        depth={depth}
                                        isOpen={isOpen}
                                        onToggle={onToggle}
                                    />
                                )}
                                classes={{
                                    root: "treeview-root",
                                    container: "treeview-list",
                                    dropTarget: "treeview-drop-target",
                                    draggingSource: "treeview-dragging"
                                }}
                                canDrop={() => false} // Disable drag and drop for now
                            />
                        ) : (
                            <NoContent />
                        )}
                    </div>
                </DndProvider>
            ) : (
                <div>Please select a workspace</div>
            )}

            {appState.selectedWorkSpace && appState.selectedWorkSpace.emails.length ? (
                <EmailList workSpace={appState.selectedWorkSpace} startDate={startDate} endDate={endDate} />
            ) : null}
        </Layout>
    );
});