import { UserType } from "./user.interface";

export interface LoginResponse {
  accessToken: string;
  user: Omit<UserType, 'password'>;
}
