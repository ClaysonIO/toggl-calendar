import {Project} from "./Project";
import {Row} from "./Row";
import {computed} from "mobx";
import {Entry} from "./Entry";

export class Group extends Row{
    public projects: Project[] = [];
    public name: string = '';
    public readonly type = 'group';

    @computed public get entries(){
        return this.projects.reduce((acc: Entry[], val: Project)=>{
            return acc.concat(val.entries);
        }, [])
    }
}