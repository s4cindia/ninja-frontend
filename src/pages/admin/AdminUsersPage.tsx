import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  listAdminUsers,
  createAdminUser,
  updateUserRole,
} from '@/services/adminApi';
import type { AdminUser } from '@/services/adminApi';

const ROLES = ['USER', 'OPERATOR', 'ADMIN', 'VIEWER'] as const;

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  OPERATOR: 'bg-[#006B6B]/10 text-[#006B6B]',
  USER: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formRole, setFormRole] = useState('OPERATOR');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirm, setFormConfirm] = useState('');

  if (currentUser?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminUsers({
        role: filterRole || undefined,
      });
      setUsers(result.users);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setFormEmail('');
    setFormFirst('');
    setFormLast('');
    setFormRole('OPERATOR');
    setFormPassword('');
    setFormConfirm('');
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formPassword !== formConfirm) {
      setCreateError('Passwords do not match');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createAdminUser({
        email: formEmail,
        firstName: formFirst,
        lastName: formLast,
        role: formRole,
        password: formPassword,
      });
      setCreateSuccess(`${formEmail} created successfully`);
      setShowCreateForm(false);
      resetForm();
      await loadUsers();
      setTimeout(() => setCreateSuccess(null), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setCreateError(
        axiosErr.response?.data?.error?.message ?? axiosErr.message ?? 'Failed to create user'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch {
      // silently handle
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A6B]">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provision operator and user accounts for the platform
        </p>
      </div>

      {/* Success banner */}
      {createSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {createSuccess}
        </div>
      )}

      {/* User list card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {/* Filter bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {!loading && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm((prev) => !prev);
            }}
            className="px-4 py-2 text-sm font-medium rounded bg-[#006B6B] text-white hover:bg-[#005858] transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {/* Inline create form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-700">New User</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formFirst}
                  onChange={(e) => setFormFirst(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formLast}
                  onChange={(e) => setFormLast(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formConfirm}
                  onChange={(e) => setFormConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {createError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-[#006B6B] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#005858] disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No users found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.tenantId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value)
                          }
                          disabled={isSelf}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
