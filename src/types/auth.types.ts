export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER' | 'VIEWER' | 'OPERATOR';
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  /**
   * Optional -- most users have 0 or 1 entries today. A user could in
   * principle belong to more than one team (see ninja-backend's Team
   * model), but the UI only surfaces the first membership for now.
   */
  teamMemberships?: Array<{
    teamRole: 'EXECUTIVE' | 'TEAM_LEADER' | 'VIEWER';
    team: { id: string; name: string };
  }>;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}
