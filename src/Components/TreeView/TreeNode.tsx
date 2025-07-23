import React from "react";
import { NodeModel } from "@minoru/react-dnd-treeview";
import { observer } from "mobx-react";
import { Cell } from "../DivCalendar/Cell";
import { DecimalToDisplayType } from "../../Utilities/Functions/DecimalToDisplayType";
import { Group } from "../../Utilities/Group";
import { Project } from "../../Utilities/Project";
import { Tag } from "../../Utilities/Tag";

interface TreeNodeData {
    type: 'group' | 'project' | 'tag';
    name: string;
    client?: string;
    color: string;
    dates: any[];
    displayType: string;
    data: Group | Project | Tag;
}

interface TreeNodeProps {
    node: NodeModel<TreeNodeData>;
    depth: number;
    isOpen: boolean;
    onToggle: () => void;
}

export const TreeNode = observer(({ node, depth, isOpen, onToggle }: TreeNodeProps) => {
    const { data } = node;
    const item = data?.data;
    const dates = data?.dates || [];
    const displayType = data?.displayType || 'time';

    if (!data || !item) return null;

    const getBackgroundColor = () => {
        switch (data.type) {
            case 'group':
                return data.color;
            case 'project':
                return depth > 0 ? "rgba(255,255,255,0.75)" : "#FFF";
            case 'tag':
                return depth > 0 ? "rgba(255,255,255,0.9)" : "#FFF";
            default:
                return "#FFF";
        }
    };

    const getBorderStyle = () => {
        switch (data.type) {
            case 'group':
                return {
                    borderTop: `2px solid ${data.color}`,
                    borderColor: data.color
                };
            case 'project':
                return {
                    borderTop: `2px solid ${data.color}`,
                    borderLeft: `2px solid ${data.color}`,
                    borderRight: `2px solid ${data.color}`,
                    borderBottom: `2px solid ${data.color}`,
                    borderColor: data.color
                };
            case 'tag':
                return {
                    borderTop: `1px solid ${data.color}`,
                    borderColor: data.color
                };
            default:
                return {};
        }
    };

    const getTextColor = () => {
        return data.type === 'group' ? 'white' : data.color;
    };

    const hasChildren = () => {
        switch (data.type) {
            case 'group':
                return (item as Group).projects.length > 0;
            case 'project':
                return (item as Project).tags.length > 0;
            default:
                return false;
        }
    };

    const getTimeSum = () => {
        if (!dates.length) return '0:00';
        const startDate = dates[0]?.toISOString();
        const endDate = dates[dates.length - 1]?.toISOString();
        
        switch (data.type) {
            case 'group':
                return DecimalToDisplayType((item as Group).timeAsHours(startDate, endDate), displayType);
            case 'project':
                return DecimalToDisplayType((item as Project).timeAsHours(startDate, endDate), displayType);
            case 'tag':
                return DecimalToDisplayType((item as Tag).timeAsHours(startDate, endDate), displayType);
            default:
                return '0:00';
        }
    };

    const gridCols = `40px 150px 100px repeat(${dates.length}, 1fr) 75px`;

    return (
        <div 
            className={`treenode-row ${data.type}Row`}
            style={{
                ...getBorderStyle(),
                backgroundColor: getBackgroundColor(),
                marginLeft: data.type === 'tag' && depth > 1 ? '40px' : '0',
                display: 'grid',
                gridTemplateColumns: gridCols,
                gridGap: '5px',
                padding: '5px'
            }}
        >
            {/* Expand button */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {hasChildren() && (
                    <button 
                        className="expander"
                        onClick={onToggle}
                        style={{ color: getTextColor() }}
                    >
                        <span className={`rotater ${isOpen ? 'rotated' : ''}`}>▶</span>
                    </button>
                )}
            </div>

            {/* Name/Title */}
            <div className="title" style={{ color: getTextColor() }}>
                {data.name}
            </div>

            {/* Client/Company */}
            <div className="title" style={{ color: getTextColor() }}>
                {data.type === 'project' ? data.client : ''}
            </div>

            {/* Date cells */}
            {dates.map((date, index) => {
                const dateKey = date.format('YYYYMMDD');
                let day;
                
                switch (data.type) {
                    case 'group':
                        day = (item as Group).dateHash[dateKey];
                        break;
                    case 'project':
                        day = (item as Project).dateHash[dateKey];
                        break;
                    case 'tag':
                        day = (item as Tag).dateHash[dateKey];
                        break;
                }
                
                return (
                    <Cell 
                        key={index} 
                        expanded={false} 
                        displayType={displayType} 
                        day={day}
                    />
                );
            })}

            {/* Sum column */}
            <div className="title sumCol" style={{ color: getTextColor() }}>
                {getTimeSum()}
            </div>
        </div>
    );
});