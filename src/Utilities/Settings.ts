import {action, makeAutoObservable, observable} from "mobx";

export class Settings{
    public apiToken: string;

    constructor() {
        makeAutoObservable(this);
        this.apiToken = window.localStorage.getItem('togglApiToken') || '';
    }

    public setApiToken(token: string){
        this.apiToken = token;
        window.localStorage.setItem("togglApiToken", token);
    }
}