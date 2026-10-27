import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminTeamsPage from './AdminTeamsPage';
import {
  listAdminTeams,
  createAdminTeam,
  addAdminTeamMember,
  removeAdminTeamMember,
  deleteAdminTeam,
  listAdminUsers,
} from '@/services/adminApi';
import type { AdminUser } from '@/services/adminApi';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/auth.types';
import type { Team } from '@/types/team.types';

vi.mock('@/services/adminApi', () => ({
  listAdminTeams: vi.fn(),
  createAdminTeam: vi.fn(),
  addAdminTeamMember: vi.fn(),
  removeAdminTeamMember: vi.fn(),
  deleteAdminTeam: vi.fn(),
  listAdminUsers: vi.fn(),
}));

const mockListAdminTeams = vi.mocked(listAdminTeams);
const mockCreateAdminTeam = vi.mocked(createAdminTeam);
const mockAddAdminTeamMember = vi.mocked(addAdminTeamMember);
const mockRemoveAdminTeamMember = vi.mocked(removeAdminTeamMember);
const mockDeleteAdminTeam = vi.mocked(deleteAdminTeam);
const mockListAdminUsers = vi.mocked(listAdminUsers);

const adminUser: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Ad',
  lastName: 'Min',
  role: 'ADMIN',
  tenantId: 'tenant-1',
};

function setCurrentUser(overrides?: Partial<User>) {
  useAuthStore.setState({
    user: { ...adminUser, ...overrides },
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'token',
    refreshToken: 'refresh',
  });
}

const mockUsers: AdminUser[] = [
  { id: 'user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Anderson', role: 'USER', createdAt: '2026-01-01T00:00:00Z', tenantId: 'tenant-1' },
  { id: 'user-2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Baker', role: 'USER', createdAt: '2026-01-01T00:00:00Z', tenantId: 'tenant-1' },
];

function mockTeam(overrides?: Partial<Team>): Team {
  return {
    id: 'team-1',
    tenantId: 'tenant-1',
    name: 'Cell A',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    members: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/teams']}>
      <Routes>
        <Route path="/admin/teams" element={<AdminTeamsPage />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminTeamsPage', () => {
  beforeEach(() => {
    mockListAdminTeams.mockReset();
    mockCreateAdminTeam.mockReset();
    mockAddAdminTeamMember.mockReset();
    mockRemoveAdminTeamMember.mockReset();
    mockDeleteAdminTeam.mockReset();
    mockListAdminUsers.mockReset().mockResolvedValue({ users: mockUsers });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('redirects a non-admin away from the page', async () => {
    setCurrentUser({ role: 'USER' });
    mockListAdminTeams.mockResolvedValue({ teams: [] });

    renderPage();

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Team Management')).not.toBeInTheDocument();
  });

  it('lists teams and their members for an admin', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValue({
      teams: [
        mockTeam({
          members: [
            {
              id: 'membership-1',
              teamId: 'team-1',
              userId: 'user-1',
              teamRole: 'EXECUTIVE',
              createdAt: '2026-01-01T00:00:00Z',
              user: { id: 'user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Anderson' },
            },
          ],
        }),
      ],
    });

    renderPage();

    expect(await screen.findByText('Team Management')).toBeInTheDocument();
    expect(await screen.findByText('Cell A')).toBeInTheDocument();
    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('EXECUTIVE')).toBeInTheDocument();
  });

  it('creates a new team', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValueOnce({ teams: [] });
    mockCreateAdminTeam.mockResolvedValue(mockTeam({ id: 'team-2', name: 'Cell B' }));
    mockListAdminTeams.mockResolvedValueOnce({ teams: [mockTeam({ id: 'team-2', name: 'Cell B' })] });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /new team/i }));
    fireEvent.change(screen.getByLabelText(/team name/i), { target: { value: 'Cell B' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    await waitFor(() => expect(mockCreateAdminTeam).toHaveBeenCalledWith('Cell B'));
    expect(await screen.findByText('Cell B')).toBeInTheDocument();
  });

  it('adds a member to a team', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValue({ teams: [mockTeam()] });
    mockAddAdminTeamMember.mockResolvedValue({
      id: 'membership-1',
      teamId: 'team-1',
      userId: 'user-1',
      teamRole: 'TEAM_LEADER',
      createdAt: '2026-01-01T00:00:00Z',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add member/i }));
    fireEvent.change(screen.getByLabelText(/^user$/i), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByLabelText(/team role/i), { target: { value: 'TEAM_LEADER' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(mockAddAdminTeamMember).toHaveBeenCalledWith('team-1', {
        userId: 'user-1',
        teamRole: 'TEAM_LEADER',
      })
    );
  });

  it('removes a member from a team', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValue({
      teams: [
        mockTeam({
          members: [
            {
              id: 'membership-1',
              teamId: 'team-1',
              userId: 'user-1',
              teamRole: 'VIEWER',
              createdAt: '2026-01-01T00:00:00Z',
              user: { id: 'user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Anderson' },
            },
          ],
        }),
      ],
    });
    mockRemoveAdminTeamMember.mockResolvedValue(undefined);

    renderPage();

    fireEvent.click(await screen.findByTitle('Remove from team'));

    await waitFor(() =>
      expect(mockRemoveAdminTeamMember).toHaveBeenCalledWith('team-1', 'user-1')
    );
  });

  it('deletes a team after confirming', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValueOnce({ teams: [mockTeam()] });
    mockDeleteAdminTeam.mockResolvedValue({ id: 'team-1' });
    mockListAdminTeams.mockResolvedValueOnce({ teams: [] });

    renderPage();

    fireEvent.click(await screen.findByTitle('Delete team'));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Cell A')
    );
    await waitFor(() => expect(mockDeleteAdminTeam).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(screen.queryByText('Cell A')).not.toBeInTheDocument());
  });

  it('does not delete a team when the confirm dialog is cancelled', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValue({ teams: [mockTeam()] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPage();

    fireEvent.click(await screen.findByTitle('Delete team'));

    expect(mockDeleteAdminTeam).not.toHaveBeenCalled();
    expect(screen.getByText('Cell A')).toBeInTheDocument();
  });

  it('shows an error inline and keeps the team when deletion fails', async () => {
    setCurrentUser();
    mockListAdminTeams.mockResolvedValue({ teams: [mockTeam()] });
    mockDeleteAdminTeam.mockRejectedValue({
      response: { data: { error: { message: 'Team not found' } } },
    });

    renderPage();

    fireEvent.click(await screen.findByTitle('Delete team'));

    await waitFor(() => expect(mockDeleteAdminTeam).toHaveBeenCalledWith('team-1'));
    expect(await screen.findByText('Team not found')).toBeInTheDocument();
    expect(screen.getByText('Cell A')).toBeInTheDocument();
  });
});
