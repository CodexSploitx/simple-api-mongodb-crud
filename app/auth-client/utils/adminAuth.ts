"use client";

import type { GetUsersResponse, DeleteUserResponse, RevokeTokensResponse, ChangePasswordResponse, AdminLoginResponse } from "../types";

export async function checkAccess(): Promise<{ allowed: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = await res.json();
    if (!res.ok || !data?.success) return { allowed: false, error: data?.error || "Unauthorized" };
    const perms = data?.data?.permissions || {};
    const allowed = Boolean(perms.authClientAccess === true);
    return { allowed, error: allowed ? undefined : "Not authorized" };
  } catch  {
    return { allowed: false, error: "Network error" };
  }
}

export async function fetchUsers(): Promise<GetUsersResponse> {
  const res = await fetch("/api/auth-client/admin/users", { credentials: "include" });
  return await res.json();
}

export async function deleteUser(
  userId: string,
  options?: {
    mode?: "delete_all" | "delete_some" | "keep_all_delete_only_auth";
    targets?: Array<{ db: string; collections: string[]; fields: ("ownerId" | "userId")[] }>;
    archive?: boolean;
    fields?: { ownerId: boolean; userId: boolean };
  }
): Promise<DeleteUserResponse> {
  const init: RequestInit = { method: "DELETE", credentials: "include" };
  if (options) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options);
  }
  const res = await fetch(`/api/auth-client/admin/users/${userId}`, init);
  return await res.json();
}

export async function revokeUserTokens(userId: string): Promise<RevokeTokensResponse> {
  const res = await fetch(`/api/auth-client/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "revokeTokens" }),
  });
  return await res.json();
}

export async function changeUserPassword(userId: string, newPassword: string): Promise<ChangePasswordResponse> {
  const res = await fetch(`/api/auth-client/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "changePassword", newPassword }),
  });
  return await res.json();
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  try {
    const res = await fetch(`/api/auth-client/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Network error" };
  }
}

export function saveSession(token: string): void {
  try {
    sessionStorage.setItem("authClientAdminToken", token);
  } catch {}
}
