import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const getStoredAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('foodbridge_token');
  if (!token || token.trim() === '' || token === 'undefined' || token === 'null') {
    return null;
  }
  return token.trim();
};

export const setStoredAuthToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (!token || token.trim() === '' || token === 'undefined' || token === 'null') {
    localStorage.removeItem('foodbridge_token');
    delete apiClient.defaults.headers.common['Authorization'];
    delete apiClient.defaults.headers.common['authorization'];
  } else {
    const cleanToken = token.trim();
    localStorage.setItem('foodbridge_token', cleanToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${cleanToken}`;
  }
};

// Initialize default Authorization header from localStorage if already signed in
const initialToken = getStoredAuthToken();
if (initialToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

// Attach JWT token from localStorage automatically on every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      if (!config.headers) {
        config.headers = new axios.AxiosHeaders();
      }
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    } else {
      if (config.headers && typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Authorization');
        (config.headers as any).delete('authorization');
      } else if (config.headers) {
        delete (config.headers as Record<string, string>)['Authorization'];
        delete (config.headers as Record<string, string>)['authorization'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gracefully handle expired or invalid sessions: clear stale token and notify UI
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthAttempt = requestUrl.includes('/api/auth/login') || requestUrl.includes('/api/auth/register');

      if (!isAuthAttempt && typeof window !== 'undefined') {
        // Clear invalid or expired session token
        setStoredAuthToken(null);

        // Dispatch notification so AuthContext immediately clears authenticated user state
        window.dispatchEvent(
          new CustomEvent('foodbridge:auth:unauthorized', {
            detail: { message: error.response?.data?.message || 'Session expired. Please sign in again.' },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);


// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type UserRole = 'provider' | 'ngo' | 'admin';

export interface UserOrganization {
  id: string;
  name: string;
  type: string;
  city?: string;
  verificationStatus?: 'pending' | 'verified' | 'approved' | 'rejected';
  capacity?: {
    maxMealsPerDay: number;
    currentAvailableCapacity: number;
    hasRefrigeration: boolean;
    hasWarmStorage: boolean;
    hasTransportFleet: boolean;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  organization?: UserOrganization | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export interface DonationTimelineEvent {
  status: string;
  timestamp: string;
  note: string;
  actorName: string;
  actorRole: string;
}

export interface DonationItem {
  _id: string;
  title: string;
  description: string;
  foodCategory: string;
  dietaryType: string;
  quantityMeals: number;
  quantityKg: number;
  preparationTime: string;
  collectionDeadline: string;
  storageRequirement: string;
  allergens: string[];
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
    city: string;
    pincode?: string;
  };
  providerId: any;
  organizationId: any;
  status: 'available' | 'requested' | 'accepted' | 'pickup_scheduled' | 'picked_up' | 'delivered' | 'completed' | 'cancelled' | 'expired' | 'flagged';
  assignedNgoId?: any;
  pickupContact: {
    name: string;
    phone: string;
    pickupInstructions?: string;
  };
  pickupOtp?: string;
  deliveryOtp?: string;
  images: string[];
  timeline: DonationTimelineEvent[];
  isDemo?: boolean;
  createdAt: string;
}

export interface MatchFactorBreakdown {
  urgency: number;
  distanceKm: number;
  distanceScore: number;
  capacityScore: number;
  availabilityScore: number;
  compatibilityScore: number;
}

export interface NgoMatchItem {
  ngoId: string;
  ngoName: string;
  organizationType: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  distanceKm: number;
  availableCapacity: number;
  maxMealsPerDay: number;
  matchScore: number;
  hasTransportFleet: boolean;
  hasRefrigeration: boolean;
  factors: MatchFactorBreakdown;
  explanation: string;
}

export interface DonationMatchResponse {
  donationId: string;
  quantityMeals: number;
  storageRequirement: string;
  collectionDeadline: string;
  matchCount: number;
  matches: NgoMatchItem[];
}

export interface DonationRequestItem {
  _id: string;
  donationId: string;
  ngoId: any;
  ngoOrganizationId: any;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  requestNotes: string;
  estimatedPickupTime: string;
  matchScore: number;
  createdAt: string;
}

export interface HealthCheckResponse {
  status: string;
  app: string;
  tagline: string;
  version: string;
  timestamp: string;
  database: {
    status: string;
    connected: boolean;
    host: string;
  };
  services: {
    aiAssistant: string;
    maps: string;
    matchingEngine: string;
  };
}

export interface ProviderVerificationItem {
  _id: string;
  name: string;
  organizationName: string;
  type: string;
  description?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  location?: any;
  verificationStatus: 'pending' | 'verified' | 'approved' | 'rejected';
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: any;
  createdAt: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  } | null;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export interface PlatformAnalytics {
  metrics: {
    totalDonations: number;
    completedDonations: number;
    activeDonations: number;
    expiredDonations: number;
    mealsRedistributed: number;
    totalMealsRedistributed?: number;
    kgRescued: number;
    totalKgFoodDiverted?: number;
    estimatedCo2AvoidedKg: number;
    totalProviders: number;
    approvedProviders?: number;
    pendingProviders?: number;
    rejectedProviders?: number;
    verifiedNgos: number;
    pendingNgos: number;
  };
  currentAlgorithmWeights: Record<string, number>;
}

// ==========================================
// API CLIENT FUNCTIONS
// ==========================================

export const fetchHealthCheck = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>('/api/health');
  return response.data;
};

// Auth
export const loginUser = async (credentials: { 
  email: string; 
  password: string; 
  portal?: 'provider' | 'ngo' | 'admin' 
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
  return response.data;
};

export const demoLoginUser = async (role: 'provider' | 'ngo' | 'admin'): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/demo-login', { role });
  return response.data;
};

export const registerUser = async (data: any): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
  return response.data;
};

export const fetchCurrentUser = async (): Promise<{ user: UserProfile }> => {
  const response = await apiClient.get<{ user: UserProfile }>('/api/auth/me');
  return response.data;
};

// Donations
export const fetchDonations = async (params: Record<string, any> = {}): Promise<{ count: number; donations: DonationItem[] }> => {
  const response = await apiClient.get('/api/donations', { params });
  return response.data;
};

export const fetchDonationById = async (id: string): Promise<{ donation: DonationItem; requests: DonationRequestItem[] }> => {
  const response = await apiClient.get(`/api/donations/${id}`);
  return response.data;
};

export const createDonationListing = async (data: any): Promise<{ message: string; donation: DonationItem }> => {
  const response = await apiClient.post('/api/donations', data);
  return response.data;
};

export const fetchMatchingNgos = async (donationId: string): Promise<DonationMatchResponse> => {
  const response = await apiClient.get(`/api/donations/${donationId}/match`);
  return response.data;
};

export const requestDonationPickup = async (
  donationId: string, 
  data: { requestNotes: string; estimatedPickupTime: string }
): Promise<{ message: string; request: any }> => {
  const response = await apiClient.post(`/api/donations/${donationId}/request`, data);
  return response.data;
};

export const respondToDonationRequest = async (
  donationId: string, 
  data: { requestId: string; action: 'approve' | 'reject' }
): Promise<any> => {
  const response = await apiClient.post(`/api/donations/${donationId}/respond-request`, data);
  return response.data;
};

export const updateDonationStatus = async (
  donationId: string,
  data: { nextStatus: string; otp?: string; note?: string }
): Promise<{ message: string; donation: DonationItem }> => {
  const response = await apiClient.post(`/api/donations/${donationId}/status`, data);
  return response.data;
};

export interface PickupOtpResponse {
  donationId: string;
  title: string;
  pickupOtp: string;
  expiresAt: string;
  attemptsRemaining: number;
  status: string;
  assignedNgo?: any;
  instructions: string;
}

export const fetchPickupOtp = async (donationId: string): Promise<PickupOtpResponse> => {
  const response = await apiClient.get<PickupOtpResponse>(`/api/donations/${donationId}/pickup-otp`);
  return response.data;
};

export const regeneratePickupOtp = async (
  donationId: string
): Promise<{ message: string; pickupOtp: string; expiresAt: string; attemptsRemaining: number }> => {
  const response = await apiClient.post(`/api/donations/${donationId}/regenerate-otp`);
  return response.data;
};

export const verifyPickupOtp = async (
  donationId: string,
  otp: string,
  note?: string
): Promise<{ message: string; donation: DonationItem }> => {
  const response = await apiClient.post(`/api/donations/${donationId}/verify-pickup`, { otp, note });
  return response.data;
};

// Requests & Pickups
export const fetchProviderIncomingRequests = async (): Promise<{ count: number; requests: any[] }> => {
  const response = await apiClient.get('/api/donations/requests/incoming');
  return response.data;
};

export const fetchNgoMyRequests = async (): Promise<{ count: number; requests: any[] }> => {
  const response = await apiClient.get('/api/donations/requests/my-requests');
  return response.data;
};

// NGOs
export const fetchNgoDirectory = async (params: Record<string, any> = {}): Promise<{ count: number; ngos: any[] }> => {
  const response = await apiClient.get('/api/ngos', { params });
  return response.data;
};

export const updateNgoCapacity = async (capacityData: any): Promise<any> => {
  const response = await apiClient.put('/api/ngos/capacity', capacityData);
  return response.data;
};

export const fetchPendingNgoVerifications = async (): Promise<{ count: number; pendingNgos: any[]; pendingProviders?: any[] }> => {
  const response = await apiClient.get('/api/admin/pending-verifications');
  return response.data;
};

export const verifyNgoOrganization = async (id: string, action: 'approve' | 'reject', notes?: string): Promise<any> => {
  const response = await apiClient.post(`/api/admin/verify-ngo/${id}`, { action, notes });
  return response.data;
};

export const fetchAdminProviders = async (params: { status?: string } = {}): Promise<{ count: number; providers: ProviderVerificationItem[] }> => {
  const response = await apiClient.get('/api/admin/providers', { params });
  return response.data;
};

export const verifyProviderOrganization = async (
  providerId: string, 
  action: 'approve' | 'reject', 
  notes?: string
): Promise<{ message: string; organization: any }> => {
  const response = await apiClient.post(`/api/admin/verify-provider/${providerId}`, { action, notes });
  return response.data;
};

export const fetchPlatformAnalytics = async (): Promise<PlatformAnalytics> => {
  const response = await apiClient.get('/api/admin/analytics');
  return response.data;
};

export const fetchAdminUsers = async (): Promise<{ count: number; users: any[] }> => {
  const response = await apiClient.get('/api/admin/users');
  return response.data;
};

export const fetchAdminAllDonations = async (): Promise<{ count: number; donations: DonationItem[] }> => {
  const response = await apiClient.get('/api/admin/donations');
  return response.data;
};

export const fetchAdminAllRequests = async (): Promise<{ count: number; requests: any[] }> => {
  const response = await apiClient.get('/api/admin/requests');
  return response.data;
};

// Demo Data Seeder
export const triggerDemoSeed = async (): Promise<any> => {
  const response = await apiClient.post('/api/demo/seed');
  return response.data;
};

