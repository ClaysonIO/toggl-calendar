import {ISingleProjectTasks} from "./ISingleProjectTasks";
import {ISingleProject} from "./ISingleProject";

export interface IProjectWeek {
    id: number,
    project_id: number,
    workspace_id: number,
    targetHours: number,
    tasks: IProjectTask[]
}

export interface IProjectTask{
    id: number,
    description: string,
    status: 'todo' | 'in-progress' | 'done',
}

export interface IMergedProjectWeek {
    id: number,
    projectWeek?: IProjectWeek,
    project?: ISingleProject,
    details?: ISingleProjectTasks
}