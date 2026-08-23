export interface IUser {
  id: string;
  name: string;
  lastName: string;
  password: string;
  cellphone?: string;
  email: string;
  grade?: string;
  birthdate?: Date;
  urlImage?: string;
  isActive: boolean;
  isDeleted: boolean;
  role: string;
}
