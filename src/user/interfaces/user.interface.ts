export interface IUser {
    name: string;
    last_name: string;
    email: string;
    cellphone: string;
    grade: string;
    birthdate: Date;
    password: string;
    url_image?: string;
    is_active: boolean;
    is_deleted: boolean;
    role: string;
  }