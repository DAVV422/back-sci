export interface IUser {
    id: string;
    name: string;
    last_name: string;
    password: string;
    cellphone?: string;
    email: string;
    grade?: string;
    birthdate?: Date;
    url_image?: string;
    is_active: boolean;
    is_deleted: boolean;
    role: string;
}
