import React from 'react';
import {observer} from "mobx-react";
import {Dayjs} from "dayjs";
import {GroupRow} from "./GroupRow";
import {Group} from "../../Utilities/Group";

export const GroupRowDraggable = observer(({group, dates, displayType, gridCols, index}: {group: Group, dates: Dayjs[], displayType: string, gridCols: string, index: number})=>{

    return (
                <div
                    id={group?.rowId}
                    className={`rowContainer`}
                >
                    <GroupRow group={group} dates={dates} displayType={displayType} gridCols={gridCols}/>
                </div>
    )
})