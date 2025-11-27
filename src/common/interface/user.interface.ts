import { Role } from "../decorators/roles.decorator";

export interface UserType {
    name: string;
    email: string;
    mobile: string;
    password: string;
    address: string;
    role: Role;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    uuid: string;
}
