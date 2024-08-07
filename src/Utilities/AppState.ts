import {Settings} from "./Settings";
import {IWorkSpace, WorkSpace} from "./WorkSpace";
import {Toggl} from "./Toggl";
import {action, makeAutoObservable, observable} from "mobx";
import {User} from "./User";

export class AppState{
    public readonly settings: Settings;
    public user?: User;
    public workSpaces: WorkSpace[] = [];
    public selectedWorkSpace?: WorkSpace;

    constructor() {
        makeAutoObservable(this);
        this.settings = new Settings();

        if(this.settings.apiToken){
            const workSpaces = JSON.parse(window.localStorage.getItem("workSpaces") || "[]") as IWorkSpace[];
            const user = window.localStorage.getItem("user") ? JSON.parse(window.localStorage.getItem("user")||"") : undefined;
            this.setWorkSpaces(workSpaces.map(val=>new WorkSpace(val)))
            this.setUser(user ? new User(user) : undefined);
        }

        this.getWorkSpaces = this.getWorkSpaces.bind(this);
    }

    public selectWorkSpace(workSpace?: WorkSpace){
        this.selectedWorkSpace = workSpace;
        window.localStorage.setItem("workSpaceId", this.selectedWorkSpace?.id.toString() || "");
    }

    public setUser(user?: User){
        this.user = user;
        if(user){
            window.localStorage.setItem("user", JSON.stringify(user.toInterface()));
        } else {
            window.localStorage.removeItem("user");
        }
    }

    public getWorkSpaces(){
        if(this.settings.apiToken){
            Toggl.GetUser(this.settings.apiToken)
                .then(user=>{
                    this.setUser(new User(user));
                    this.setWorkSpaces(user.workspaces.map(val=>new WorkSpace(val, this.settings.apiToken)))
                })
                .catch(err=>alert(err));

        }
    }

    private setWorkSpaces(workSpaces: WorkSpace[]){
        this.workSpaces = workSpaces.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en', {numeric: true}));

        window.localStorage.setItem("workSpaces", JSON.stringify(this.workSpaces.map(val=>val.toInterface())));

        const lastSelectedWorkSpace = window.localStorage.getItem("workSpaceId");

        if(lastSelectedWorkSpace){
            this.selectWorkSpace(this.workSpaces.find(val=>val.id.toString() === lastSelectedWorkSpace))
        }
    }
}