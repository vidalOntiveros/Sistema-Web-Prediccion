export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}
