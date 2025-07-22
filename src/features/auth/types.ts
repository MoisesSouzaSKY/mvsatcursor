export interface AuthUser {
  id: string;
  email: string;
  nome?: string;
  created_at: Date;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  nome?: string;
}

export interface EmployeeLoginData {
  login: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  success: boolean;
  message?: string;
} 