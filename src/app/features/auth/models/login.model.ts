export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginUser {
  id_physio: number;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  user: LoginUser;
}
