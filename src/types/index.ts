// Member types
export interface Spouse {
  name: string;
  phoneNumber?: string;
  birthday?: string;
  hometown?: string;
}

export interface CustomField {
  label: string;
  type: 'text' | 'number' | 'date' | 'image' | 'boolean';
  value: string | number | boolean;
}

export interface Member {
  _id: string;
  name: string;
  gender: 'male' | 'female';
  birthday?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  isAlive: boolean;
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  spouse?: Spouse[];
  deathDate?: string;
  parent?: string | Member | null;
  children: (string | Member)[];
  order?: number;
  createdBy: string;
  viewCode?: string;
  customFields?: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

// Form data types for creating/editing members
export interface MemberFormData {
  name: string;
  gender: 'male' | 'female';
  birthday?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  isAlive: boolean;
  phoneNumber?: string;
  address?: string;
  spouse?: Spouse | Spouse[];
  deathDate?: string;
  parent?: string | null;
  children?: string[];
}

// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

// API Response types
export interface LoginResponse {
  token: string;
  user?: User;
}

export interface ViewCodeResponse {
  viewCode: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
