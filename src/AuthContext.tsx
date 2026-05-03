import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type AuthContextType = {
  isAdmin: boolean;
  isLoadingAuth: boolean;
  checkAuth: (providedToken?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  token: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [memoryToken, setMemoryToken] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (memoryToken) return memoryToken;
    try {
      return localStorage.getItem('admin_token');
    } catch {
      return null;
    }
  }, [memoryToken]);

  const setToken = useCallback((token: string) => {
    setMemoryToken(token);
    try {
      localStorage.setItem('admin_token', token);
    } catch {
      // ignore
    }
  }, []);

  const removeToken = useCallback(() => {
    setMemoryToken(null);
    try {
      localStorage.removeItem('admin_token');
    } catch {
      // ignore
    }
  }, []);

  const checkAuth = useCallback(async (providedToken?: string) => {
    setIsLoadingAuth(true);
    try {
      const activeToken = providedToken || getToken();
      const res = await fetch('/api/auth/check', {
        headers: activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
      });
      const data = await res.json();
      if (!data.isAdmin) {
        removeToken();
      } else if (activeToken) {
        setToken(activeToken);
      }
      setIsAdmin(data.isAdmin === true);
      return data.isAdmin === true;
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  }, [getToken, removeToken, setToken]);

  const logout = async () => {
    removeToken();
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdmin(false);
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ isAdmin, isLoadingAuth, checkAuth, logout, setToken, token: getToken() }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
