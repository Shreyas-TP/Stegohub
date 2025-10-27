import React, { createContext, useState, useContext, useEffect } from 'react';

// Define user type
export interface User {
  id: string;
  username: string;
  email: string;
}

// Define history entry type
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
  logout: () => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'userId' | 'timestamp'>) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'stegohub-user';
const HISTORY_STORAGE_KEY = 'stegohub-history';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Save user to local storage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  // Save history to local storage when it changes
  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Login function
  const login = async (email: string, password: string) => {
    // In a real app, this would make an API call
    // For now, we'll simulate a successful login with mock data
    
    // Simple validation
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Mock successful login
    const mockUser: User = {
      id: crypto.randomUUID(),
      username: email.split('@')[0],
      email
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    
    // Load user's history
    const userHistory = history.filter(entry => entry.userId === mockUser.id);
    setHistory(userHistory);
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    // In a real app, this would make an API call
    // For now, we'll simulate a successful registration
    
    // Simple validation
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }
    
    // Mock successful registration
    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email
    };
    
    setUser(newUser);
    setIsAuthenticated(true);
    
    // Initialize empty history for new user
    setHistory([]);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  // Add history entry
  const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) return;
    
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      userId: user.id,
      timestamp: Date.now()
    };
    
    setHistory(prev => [newEntry, ...prev]);
  };

  const value = {
    user,
    isAuthenticated,
    history,
    login,
    register,
    logout,
    addHistoryEntry
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