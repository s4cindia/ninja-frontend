// Production-oversight team roles (TeamRole), orthogonal to the platform-wide
// UserRole (ADMIN/USER/VIEWER/OPERATOR) already used for admin gating
// elsewhere. See ninja-backend's RBAC design doc for the full rationale.
export type TeamRole = 'EXECUTIVE' | 'TEAM_LEADER' | 'VIEWER';

export const TEAM_ROLES: TeamRole[] = ['EXECUTIVE', 'TEAM_LEADER', 'VIEWER'];

export interface TeamMemberUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  teamRole: TeamRole;
  createdAt: string;
  user?: TeamMemberUser;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members?: TeamMembership[];
}

// GET /jobs/team's shape -- mirrors job.controller.ts's respondWithJobList()
// select exactly (notably: no `updatedAt`, unlike jobs.service.ts's `Job`,
// and `userId` is included so a Team Leader/Viewer can tell whose job it is,
// though not yet resolved to a display name -- see MyTeamPage.tsx).
export interface TeamJob {
  id: string;
  type: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  priority?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  productId?: string | null;
  product?: { id: string; title: string } | null;
  userId: string;
  documentId?: string;
}
