"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRecord, DeleteUserResponse } from "../types";
import { deleteUser, revokeUserTokens } from "../utils/adminAuth";
import ConfirmDialog from "./ConfirmDialog";
import PasswordChangeModal from "./PasswordChangeModal";
import DeleteUserModal from "./DeleteUserModal";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/outline";

interface UserTableProps {
  users: UserRecord[];
  onUpdate: () => void;
}

export default function UserTable({ users, onUpdate }: UserTableProps) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [users]);
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const visibleUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return users.slice(start, end);
  }, [users, page]);
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

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: UserRecord | null;
  }>({ isOpen: false, user: null });

  const handleDelete = (user: UserRecord) => {
    setDeleteModal({ isOpen: true, user });
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
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
            {visibleUsers.map((user) => (
              <tr key={user._id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                <td className="py-3 px-4 text-sm text-[var(--text-muted)] font-mono">{user._id.slice(-8)}</td>
                <td className="py-3 px-4 text-sm text-[var(--text)]">{user.email}</td>
                <td className="py-3 px-4 text-sm text-[var(--text)] font-medium">{user.username}</td>
                <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{formatDate(user.createdAt)}</td>
                <td className="py-3 px-4 text-sm text-[var(--text-muted)]">{user.tokenVersion}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 bg-[var(--card)] p-2 rounded-md">
                    <button
                      onClick={() => handleChangePassword(user)}
                      className="cursor-pointer bg-[var(--surface)] relative inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--border)] text-[var(--text-muted)] h-8 px-3 hover:text-[var(--warning)]"
                      title="Change Password"
                    >
                      Password
                    </button>
                    <button
                      onClick={() => handleRevokeTokens(user)}
                      className="cursor-pointer bg-[var(--surface)] relative inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--border)] text-[var(--text-muted)] h-8 px-3 hover:text-[var(--success)]"
                      title="Revoke Tokens"
                    >
                      Revoke
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="cursor-pointer bg-[var(--surface)] relative inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--border)] text-[var(--text-muted)] h-8 px-3 hover:text-[var(--danger)]"
                      title="Delete User"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => alert('Logs próximamente')}
                      className="cursor-pointer bg-[var(--surface)] relative inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--border)] text-[var(--text-muted)] h-8 px-3 hover:text-[var(--primary)]"
                      title="Logs"
                    >
                      Logs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center mt-4">
        <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="cursor-pointer h-8 px-2 text-xs text-[var(--text-muted)] disabled:opacity-50 hover:bg-[var(--border)]"
            title="First"
            aria-label="First page"
          >
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="cursor-pointer h-8 px-2 text-xs text-[var(--text-muted)] disabled:opacity-50 hover:bg-[var(--border)]"
            title="Previous"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <div className="px-3 h-8 flex items-center text-xs text-[var(--text-muted)] border-x border-[var(--border)]">
            {page}/{totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="cursor-pointer h-8 px-2 text-xs text-[var(--text-muted)] disabled:opacity-50 hover:bg-[var(--border)]"
            title="Next"
            aria-label="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="cursor-pointer h-8 px-2 text-xs text-[var(--text-muted)] disabled:opacity-50 hover:bg-[var(--border)]"
            title="Last"
            aria-label="Last page"
          >
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </button>
        </div>
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

      <DeleteUserModal
        isOpen={deleteModal.isOpen}
        user={deleteModal.user}
        onClose={() => setDeleteModal({ isOpen: false, user: null })}
        onConfirm={async (options) => {
          if (!deleteModal.user) return Promise.resolve<DeleteUserResponse>({ success: false, error: "No user" });
          return await deleteUser(deleteModal.user._id, options);
        }}
        onResult={(res) => {
          if (res?.success) {
            onUpdate();
          } else if (res?.error) {
            alert(res.error);
          }
        }}
      />
    </>
  );
}
