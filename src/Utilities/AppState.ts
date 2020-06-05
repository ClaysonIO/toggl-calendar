import {Settings} from "./Settings";
import {IWorkSpace, WorkSpace} from "./WorkSpace";
import {Toggl} from "./Toggl";
import {action, observable} from "mobx";

export class AppState{
    public readonly settings: Settings;
    @observable public workSpaces: WorkSpace[] = [];
    @observable public selectedWorkSpace?: WorkSpace;

    constructor() {
        this.settings = new Settings();

        if(this.settings.apiToken){
            const workSpaces = JSON.parse(window.localStorage.getItem("workSpaces") || "[]") as IWorkSpace[];
            this.setWorkSpaces(workSpaces.map(val=>new WorkSpace(val, this.settings.apiToken)))
        }

        this.getWorkSpaces = this.getWorkSpaces.bind(this);
    }

    @action public selectWorkSpace(workSpace?: WorkSpace){
        this.selectedWorkSpace = workSpace;
        window.localStorage.setItem("workSpaceId", this.selectedWorkSpace?.id.toString() || "");
    }

    public getWorkSpaces(){
        if(this.settings.apiToken){
            Toggl.GetWorkSpaces(this.settings.apiToken)
                .then((workspaces)=>{
                    this.setWorkSpaces(workspaces);
                })
                .catch(err=>alert(err));
        }
    }

    @action private setWorkSpaces(workSpaces: WorkSpace[]){
        this.workSpaces = workSpaces.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en', {numeric: true}));

        window.localStorage.setItem("workSpaces", JSON.stringify(this.workSpaces.map(val=>val.toString())));

        const lastSelectedWorkSpace = window.localStorage.getItem("workSpaceId");

        if(lastSelectedWorkSpace){
            this.selectWorkSpace(this.workSpaces.find(val=>val.id.toString() === lastSelectedWorkSpace))
        }
    }
}