interface ITask {
    tid: string;
    name: string;
    description: string;
}

export class Task {
    public tid: string;
    public name: string;
    public description: string;

    constructor({tid, name, description}: ITask) {
        this.tid = tid;
        this.name = name;
        this.description = description;
    }
}