import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserProfile, loginUser, demoLoginUser, registerUser, fetchCurrentUser, getStoredAuthToken, setStoredAuthToken } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email: string; password: string; portal?: 'provider' | 'ngo' | 'admin' }) => Promise<UserProfile>;
  demoLogin: (role: 'provider' | 'ngo' | 'admin') => Promise<UserProfile>;
  register: (data: any) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Load existing session and listen for session expiry events
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = getStoredAuthToken();
      if (storedToken) {
        setStoredAuthToken(storedToken);
        try {
          const { user } = await fetchCurrentUser();
          if (isMounted) {
            setUser(user);
            setToken(storedToken);
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          if (isMounted) {
            setStoredAuthToken(null);
            setToken(null);
            setUser(null);
          }
        }
      } else {
        if (isMounted) {
          setStoredAuthToken(null);
          setToken(null);
          setUser(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for global 401 unauthorized notifications from apiClient interceptor
    const handleUnauthorized = () => {
      if (isMounted) {
        setStoredAuthToken(null);
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener('foodbridge:auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('foodbridge:auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: { email: string; password: string; portal?: 'provider' | 'ngo' | 'admin' }): Promise<UserProfile> => {
    // Clear any previous session token first to avoid cross-tab/portal token bleeding
    setStoredAuthToken(null);
    const response = await loginUser(credentials);
    const cleanToken = response.token ? response.token.trim() : '';
    setStoredAuthToken(cleanToken);
    setToken(cleanToken);
    setUser(response.user);
    return response.user;
  };

  const demoLogin = async (role: 'provider' | 'ngo' | 'admin'): Promise<UserProfile> => {
    setStoredAuthToken(null);
    const response = await demoLoginUser(role);
    const cleanToken = response.token ? response.token.trim() : '';
    setStoredAuthToken(cleanToken);
    setToken(cleanToken);
    setUser(response.user);
    return response.user;
  };

  const register = async (data: any): Promise<UserProfile> => {
    setStoredAuthToken(null);
    const response = await registerUser(data);
    const cleanToken = response.token ? response.token.trim() : '';
    setStoredAuthToken(cleanToken);
    setToken(cleanToken);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    setStoredAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, demoLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
