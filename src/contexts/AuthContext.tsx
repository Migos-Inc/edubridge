import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  signInAnonymously: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAnonymous: false,
  signInAnonymously: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check if user is in anonymous mode
    checkAnonymousMode();

    return () => subscription.unsubscribe();
  }, []);

  const checkAnonymousMode = async () => {
    const anonymousMode = await AsyncStorage.getItem('anonymous_mode');
    setIsAnonymous(anonymousMode === 'true');
  };

  const signInAnonymously = async () => {
    try {
      // Set anonymous mode flag
      await AsyncStorage.setItem('anonymous_mode', 'true');
      await AsyncStorage.setItem('anonymous_user_id', generateAnonymousId());
      setIsAnonymous(true);
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Clear anonymous mode
      await AsyncStorage.removeItem('anonymous_mode');
      await AsyncStorage.removeItem('anonymous_user_id');
      setIsAnonymous(false);

      setSession(data.session);
      setUser(data.user);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Clear anonymous mode
      await AsyncStorage.removeItem('anonymous_mode');
      await AsyncStorage.removeItem('anonymous_user_id');
      setIsAnonymous(false);

      setSession(data.session);
      setUser(data.user);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all local data
      await AsyncStorage.clear();

      setSession(null);
      setUser(null);
      setIsAnonymous(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const generateAnonymousId = (): string => {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const value = {
    session,
    user,
    loading,
    isAnonymous,
    signInAnonymously,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
