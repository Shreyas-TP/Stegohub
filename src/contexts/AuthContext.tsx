import React, { createContext, useState, useContext, useEffect } from 'react';
import { signIn, signUp, signOut, getUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fetchHistory } from '@/lib/history';
import type { StegoHistoryRow } from '@/lib/types';

// Define user type
export interface User {
  id: string;
  username: string;
  email: string;
}

// Define history entry type (keeping for backward compatibility)
export interface HistoryEntry {
  id: string;
  userId: string;
  timestamp: number;
  operation: 'encode' | 'decode';
  algorithm: string;
  imageHash: string;
}

// Define context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  history: HistoryEntry[];
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'userId' | 'timestamp'>) => void;
  refreshHistory: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user and history on mount and auth changes
  useEffect(() => {
    loadUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        loadUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUser = async () => {
    try {
      const authUser = await getUser();
      if (authUser) {
        const userObj: User = {
          id: authUser.id,
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || ''
        };
        setUser(userObj);
        setIsAuthenticated(true);
        await loadHistory();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setHistory([]);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
      setHistory([]);
    }
  };

  const loadHistory = async () => {
    try {
      const dbHistory = await fetchHistory();
      // Convert DB history to local format for backward compatibility
      const localHistory: HistoryEntry[] = dbHistory.map((entry: StegoHistoryRow) => ({
        id: entry.id,
        userId: entry.user_id,
        timestamp: new Date(entry.created_at).getTime(),
        operation: 'encode' as const, // Default to encode, could be determined from metadata
        algorithm: entry.algorithm,
        imageHash: entry.stego_file?.sha256 || ''
      }));
      setHistory(localHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    await signIn(email, password);
    await loadUser();
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }
    
    await signUp(email, password);
    // Note: Supabase doesn't store username in user_metadata by default
    // You might want to update user_metadata after signup or use a separate profile table
    await loadUser();
  };

  // Logout function
  const logout = async () => {
    await signOut();
    setUser(null);
    setIsAuthenticated(false);
    setHistory([]);
  };

  // Add history entry (kept for backward compatibility, but history is now from DB)
  const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'userId' | 'timestamp'>) => {
    // This is a no-op now since history comes from DB
    // The actual history is saved via saveStegoHistory in uploadFile/history.ts
    console.log('addHistoryEntry called (legacy, history now from DB)');
  };

  const refreshHistory = async () => {
    if (isAuthenticated) {
      await loadHistory();
    }
  };

  const value = {
    user,
    isAuthenticated,
    history,
    login,
    register,
    logout,
    addHistoryEntry,
    refreshHistory
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};