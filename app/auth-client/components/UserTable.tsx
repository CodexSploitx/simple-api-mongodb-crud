"use client";

import { useState } from "react";
import type { UserRecord } from "../types";
import { deleteUser, revokeUserTokens } from "../utils/adminAuth";
import ConfirmDialog from "./ConfirmDialog";
import PasswordChangeModal from "./PasswordChangeModal";

interface UserTableProps {
  users: UserRecord[];
  onUpdate: () => void;
}

export default function UserTable({ users, onUpdate }: UserTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger",
  });

  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
  }>({
    isOpen: false,
    userId: "",
    username: "",
  });

  const handleDelete = (user: UserRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        const result = await deleteUser(user._id);
        if (result.success) {
          onUpdate();
        } else {
          alert(result.error || "Failed to delete user");
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleRevokeTokens = (user: UserRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: "Revoke Tokens",
      message: `Revoke all active tokens for user "${user.username}"? The user will need to log in again.`,
      variant: "warning",
      onConfirm: async () => {
        const result = await revokeUserTokens(user._id);
        if (result.success) {
          onUpdate();
        } else {
          alert(result.error || "Failed to revoke tokens");
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleChangePassword = (user: UserRecord) => {
    setPasswordModal({
      isOpen: true,
      userId: user._id,
      username: user.username,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Username</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Created At</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Token Version</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                <td className="py-3 px-4 text-sm text-[var(--text-muted)] font-mono">{user._id.slice(-8)}</td>
                <td className="py-3 px-4 text-sm text-[var(--text)]">{user.email}</td>
                <td className="py-3 px-4 text-sm text-[var(--text)] font-medium">{user.username}</td>
                <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{formatDate(user.createdAt)}</td>
                <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{user.tokenVersion}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleChangePassword(user)}
                      className="px-3 py-1 text-xs rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors"
                      title="Change Password"
                    >
                      Password
                    </button>
                    <button
                      onClick={() => handleRevokeTokens(user)}
                      className="px-3 py-1 text-xs rounded-md bg-[var(--warning)] hover:bg-amber-600 text-black transition-colors"
                      title="Revoke Tokens"
                    >
                      Revoke
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="px-3 py-1 text-xs rounded-md bg-[var(--danger)] hover:bg-red-600 text-white transition-colors"
                      title="Delete User"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      <PasswordChangeModal
        isOpen={passwordModal.isOpen}
        userId={passwordModal.userId}
        username={passwordModal.username}
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        onSuccess={() => {
          setPasswordModal({ ...passwordModal, isOpen: false });
          onUpdate();
        }}
      />
    </>
  );
}
