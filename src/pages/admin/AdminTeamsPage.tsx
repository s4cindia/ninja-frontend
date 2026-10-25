import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Network, Plus, Trash2, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  listAdminTeams,
  createAdminTeam,
  addAdminTeamMember,
  removeAdminTeamMember,
  listAdminUsers,
} from '@/services/adminApi';
import type { AdminUser } from '@/services/adminApi';
import type { Team, TeamRole } from '@/types/team.types';
import { TEAM_ROLES } from '@/types/team.types';

const TEAM_ROLE_BADGE: Record<TeamRole, string> = {
  EXECUTIVE: 'bg-blue-100 text-blue-700',
  TEAM_LEADER: 'bg-[#006B6B]/10 text-[#006B6B]',
  VIEWER: 'bg-gray-100 text-gray-600',
};

export default function AdminTeamsPage() {
  const { user: currentUser } = useAuthStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Per-team "add member" form state, keyed by teamId.
  const [memberFormTeamId, setMemberFormTeamId] = useState<string | null>(null);
  const [memberFormUserId, setMemberFormUserId] = useState('');
  const [memberFormRole, setMemberFormRole] = useState<TeamRole>('EXECUTIVE');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsResult, usersResult] = await Promise.all([
        listAdminTeams(),
        listAdminUsers(),
      ]);
      setTeams(teamsResult.teams);
      setUsers(usersResult.users);
    } catch {
      // silently handle, mirroring AdminUsersPage
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (currentUser?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const resetCreateForm = () => {
    setFormName('');
    setCreateError(null);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createAdminTeam(formName);
      setShowCreateForm(false);
      resetCreateForm();
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setCreateError(
        axiosErr.response?.data?.error?.message ?? axiosErr.message ?? 'Failed to create team'
      );
    } finally {
      setCreating(false);
    }
  };

  const openMemberForm = (teamId: string) => {
    setMemberFormTeamId(teamId);
    setMemberFormUserId('');
    setMemberFormRole('EXECUTIVE');
    setMemberError(null);
  };

  const handleAddMember = async (e: React.FormEvent, teamId: string) => {
    e.preventDefault();
    if (!memberFormUserId) {
      setMemberError('Select a user');
      return;
    }
    setAddingMember(true);
    setMemberError(null);
    try {
      await addAdminTeamMember(teamId, { userId: memberFormUserId, teamRole: memberFormRole });
      setMemberFormTeamId(null);
      await load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setMemberError(
        axiosErr.response?.data?.error?.message ?? axiosErr.message ?? 'Failed to add member'
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await removeAdminTeamMember(teamId, userId);
      await load();
    } catch {
      // The member list is re-fetched regardless, so a transient failure
      // just leaves the row in place for the admin to retry.
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Team Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Production-oversight teams (Executive / Team Leader / Viewer) — orthogonal to
          platform roles. A Team Leader or Viewer can see their teammates' jobs under
          "My Team"; a Team Leader can also leave a non-blocking spot-check review.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {!loading && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {teams.length} team{teams.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateForm((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-[#006B6B] text-white hover:bg-[#005858] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'New Team'}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreateTeam}
            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-700">New Team</h3>
            <div>
              <label htmlFor="team-name" className="block text-xs font-medium text-gray-600 mb-1">
                Team Name *
              </label>
              <input
                id="team-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g., Cell A"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
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
                {creating ? 'Creating…' : 'Create Team'}
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

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading teams…
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Network className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No teams yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="font-medium text-gray-900">{team.name}</div>
                  <button
                    onClick={() => openMemberForm(team.id)}
                    className="flex items-center gap-1 text-sm text-[#006B6B] hover:text-[#005858]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>

                {memberFormTeamId === team.id && (
                  <form
                    onSubmit={(e) => handleAddMember(e, team.id)}
                    className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap items-end gap-3"
                  >
                    <div>
                      <label htmlFor="member-user" className="block text-xs font-medium text-gray-600 mb-1">User</label>
                      <select
                        id="member-user"
                        value={memberFormUserId}
                        onChange={(e) => setMemberFormUserId(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select a user…</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="member-team-role" className="block text-xs font-medium text-gray-600 mb-1">Team Role</label>
                      <select
                        id="member-team-role"
                        value={memberFormRole}
                        onChange={(e) => setMemberFormRole(e.target.value as TeamRole)}
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {TEAM_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="bg-[#006B6B] text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-[#005858] disabled:opacity-50 transition-colors"
                    >
                      {addingMember ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberFormTeamId(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    {memberError && (
                      <div className="w-full text-sm text-red-700">{memberError}</div>
                    )}
                  </form>
                )}

                {team.members && team.members.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-200">
                      {team.members.map((m) => (
                        <tr key={m.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{m.user?.email}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${TEAM_ROLE_BADGE[m.teamRole]}`}
                            >
                              {m.teamRole}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleRemoveMember(team.id, m.userId)}
                              className="text-gray-400 hover:text-red-600"
                              title="Remove from team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-400">No members yet.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
