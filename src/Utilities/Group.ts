import {Project} from "./Project";
import {Row} from "./Row";
import {action, computed, observable} from "mobx";
import {Entry} from "./Entry";
import {WorkSpace} from "./WorkSpace";

interface IGroup {
    rowId?: string,
    name: string,
    projectIds?: string[],
    color?: string
}

export class Group extends Row{
    @observable public projectIds: string[] = [];
    public name: string = '';
    public readonly type = 'group';

    constructor({name, rowId, projectIds, color}: IGroup, workSpace: WorkSpace) {
        super({workSpace});
        this.name = name;
        this.projectIds = projectIds || this.projectIds;
        this.rowId = rowId || `Group_${name}`
        this.color = color || this.color;
    }

    @computed public get projects(){
        return this.workSpace.projects.filter(val=>this.projectIds.indexOf(val.rowId) > -1)
    }

    @computed public get entries(){
        return this.projects.reduce((acc: Entry[], val: Project)=>{
            return acc.concat(val.entries);
        }, [])
    }

    @action public setProjectIds(projectIds: string[]){
        this.projectIds = projectIds;
    }

    public serialize(){
        return JSON.stringify({
            rowId: this.rowId,
            name: this.name,
            projectIds: this.projectIds,
            color: this.color
        })
    }

    public static deserialize(serialized: string, workSpace: WorkSpace){
        const deserialized = JSON.parse(serialized) as IGroup;

        return new Group(deserialized, workSpace)
    }
}

