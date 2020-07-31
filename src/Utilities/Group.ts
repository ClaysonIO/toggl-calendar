import {Project} from "./Project";
import {Row} from "./Row";
import {computed} from "mobx";
import {Entry} from "./Entry";

interface IGroup {
    rowId?: string,
    name: string,
    projectIds?: string[],
    color?: string
}

export class Group extends Row{
    public projectIds: string[] = [];
    public projects: Project[] = [];
    public name: string = '';
    public readonly type = 'group';

    constructor({name, rowId, projectIds, color}: IGroup) {
        super();
        this.name = name;
        this.projectIds = projectIds || this.projectIds;
        this.rowId = rowId || `Group_${name}`
        this.color = color || this.color;
    }

    @computed public get entries(){
        return this.projects.reduce((acc: Entry[], val: Project)=>{
            return acc.concat(val.entries);
        }, [])
    }

    public serialize(){
        return JSON.stringify({
            rowId: this.rowId,
            name: this.name,
            projectIds: this.projectIds,
            color: this.color
        })
    }

    public static deserialize(serialized: string){
        const deserialized = JSON.parse(serialized) as IGroup;

        return new Group(deserialized)
    }
}

