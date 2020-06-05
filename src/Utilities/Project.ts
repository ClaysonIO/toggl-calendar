import {Day} from "./Day";
import {Task} from "./Task";

interface IProject {
    pid: string;
    project: string;
}

export class Project{
    public pid: string;
    public tasks: Task[] = []
    public days: Day[] = [];
    public name: string = ""

    constructor({pid, project}: IProject) {
        this.pid = pid;
        this.name = project;
    }
}