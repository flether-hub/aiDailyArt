import React, { createContext, useContext, useState, useEffect } from 'react';

type AuthContextType = {
  isAdmin: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/auth/check', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!data.isAdmin) {
        localStorage.removeItem('admin_token');
      }
      setIsAdmin(data.isAdmin === true);
      return data.isAdmin === true;
    } catch {
      setIsAdmin(false);
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem('admin_token');
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdmin(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, checkAuth, logout }}>
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
