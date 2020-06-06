import {Day} from "./Day";
import {Task} from "./Task";

interface IProject {
    pid: number;
    project: string;
    client: string;
}

export class Project{
    public pid: number;
    public client: string;
    public tasks: Task[] = []
    public days: Day[] = [];
    public name: string = ""

    constructor({pid, project, client}: IProject) {
        this.pid = pid;
        this.name = project;
        this.client = client;
    }
}