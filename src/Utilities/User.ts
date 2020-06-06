import {IUser} from "./Interfaces/IUser";

export class User{
    public id: number;
    public fullname: string;

    constructor({id, fullname}: IUser) {
        this.id = id;
        this.fullname = fullname;
    }

    public toInterface(){
        return {
            id: this.id,
            fullname: this.fullname,
        }
    }
}