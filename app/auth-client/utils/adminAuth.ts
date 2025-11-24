"use client";

import type { AdminSession, AdminLoginResponse, GetUsersResponse, DeleteUserResponse, RevokeTokensResponse, ChangePasswordResponse } from "../types";

const SESSION_KEY = "admin_session";

export function saveSession(token: string): void {
  const session: AdminSession = {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AdminSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  const session: AdminSession = JSON.parse(stored);
  if (session.expiresAt < Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  const response = await fetch("/api/auth-client/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  return await response.json();
}

export async function fetchUsers(): Promise<GetUsersResponse> {
  const session = getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const response = await fetch("/api/auth-client/admin/users", {
    headers: { Authorization: `Bearer ${session.token}` },
  });

  return await response.json();
}

export async function deleteUser(userId: string): Promise<DeleteUserResponse> {
  const session = getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const response = await fetch(`/api/auth-client/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.token}` },
  });

  return await response.json();
}

export async function revokeUserTokens(userId: string): Promise<RevokeTokensResponse> {
  const session = getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const response = await fetch(`/api/auth-client/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "revokeTokens" }),
  });

  return await response.json();
}

export async function changeUserPassword(userId: string, newPassword: string): Promise<ChangePasswordResponse> {
  const session = getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const response = await fetch(`/api/auth-client/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "changePassword", newPassword }),
  });

  return await response.json();
}
