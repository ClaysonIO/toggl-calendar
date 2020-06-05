import {Project} from "./Project";
import {Dayjs} from "dayjs";

export interface IWorkSpace{
    id: number;
    name: string;
    rounding: number;
    rounding_minutes: number;
}

export class WorkSpace{
    public id: number;
    public name: string;
    public rounding: number;
    public rounding_minutes: number;
    public projects: Project[] = [];

    constructor({id, name, rounding, rounding_minutes}: IWorkSpace, apiKey: string) {
        this.id = id;
        this.name = name;
        this.rounding = rounding;
        this.rounding_minutes = rounding_minutes;
    }

    public getProjects(){

    }

    public getTasks(startDate: Dayjs, endDate: Dayjs){

    }

    public toString(): IWorkSpace{
        return {
            id: this.id,
            name: this.name,
            rounding_minutes: this.rounding_minutes,
            rounding: this.rounding
        }
    }
}