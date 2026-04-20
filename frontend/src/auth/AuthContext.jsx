import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from './api';
import { Globe } from 'lucide-react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      console.log("AUTH_DRV: Initiating Secure Link sync...");
      
      if (!token) {
        console.log("AUTH_DRV: No token found. Safe fallback.");
        setUser(null);
        setLoading(false);
        return;
      }

      // 10-second connection timeout failsafe for high-latency tactical environments
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Uplink Timeout")), 10000)
      );

      try {
        console.log("AUTH_DRV: Validating Uplink...");
        const res = await Promise.race([authAPI.getMe(), timeout]);
        const userData = res.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log("AUTH_DRV: Synchronization Complete.");
      } catch (err) {
        console.warn("AUTH_DRV: Sync Interrupted - ", err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token, user } = res.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (email, password, role) => {
    return await authAPI.register(email, password, role);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
        <Globe className="text-[#3b82f6] w-12 h-12 animate-pulse mb-4" />
        <h2 className="font-bold tracking-widest uppercase text-[10px] text-[#64748b]">Synchronizing Secure Link...</h2>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
