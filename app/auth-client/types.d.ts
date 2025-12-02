// Auth Client Admin Dashboard Types

export interface AdminCredentials {
  username: string;
  password: string;
}

export interface AdminSession {
  token: string;
  expiresAt: number;
}

export interface UserRecord {
  _id: string;
  email: string;
  username: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserManagementAction {
  type: 'delete' | 'revoke' | 'changePassword';
  userId: string;
  newPassword?: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface GetUsersResponse {
  success: boolean;
  users?: UserRecord[];
  error?: string;
}

export interface DeleteUserResponse {
  success: boolean;
  message?: string;
  error?: string;
  deletedByCollection?: { db: string; collection: string; deletedCount: number }[];
  totalDeleted?: number;
  archived?: boolean;
}

export interface RevokeTokensResponse {
  success: boolean;
  newTokenVersion?: number;
  message?: string;
  error?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export interface PasswordChangeModalProps {
  isOpen: boolean;
  userId: string;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}
