import {Project} from "./Project";
import {computed} from "mobx";
import {Day} from "./Day";

export class Group{
    public projects: Project[] = [];
    public name: string = '';
    public client: string = '';
    public id: string = Math.random().toString();
    public project_hex_color: string = "#000"


    @computed public get dateHash(): any{
        return {};
    }

    public hours(startDate: string, endDate: string){

    }

    public roundedHours(startDate: string, endDate: string){

    }
}