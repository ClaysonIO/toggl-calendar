import {action, observable} from "mobx";

export class Settings{
    @observable public apiToken: string;

    constructor() {
        this.apiToken = window.localStorage.getItem('togglApiToken') || '';
    }

    @action public setApiToken(token: string){
        this.apiToken = token;
        window.localStorage.setItem("togglApiToken", token);
    }
}