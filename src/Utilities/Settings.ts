import {action, makeAutoObservable, observable} from "mobx";
import {TEST_TOGGL_API_KEY} from "./testingEnv";

export class Settings{
    public apiToken: string;

    constructor() {
        makeAutoObservable(this);
        const localStorageApiToken = window.localStorage.getItem("togglApiToken")
            || window.localStorage.getItem("togglApiKey")
            || "";

        this.apiToken = localStorageApiToken || TEST_TOGGL_API_KEY;

        if (this.apiToken) {
            window.localStorage.setItem("togglApiToken", this.apiToken);
            window.localStorage.setItem("togglApiKey", this.apiToken);
        }
    }

    public setApiToken(token: string){
        this.apiToken = token;
        window.localStorage.setItem("togglApiToken", token);
        window.localStorage.setItem("togglApiKey", token);
    }
}