import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEV_CONFIG, MOCK_USER_DATA, shouldUseDevAuth } from '@/config/devConfig';
import { useDevRole } from '@/contexts/DevRoleContext';

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  display_teacher_id?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isDevMode: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  // Get dev role context - this should work since DevRoleProvider wraps AuthProvider
  const { currentRole: devRole } = useDevRole();

  useEffect(() => {
    const useDevAuth = shouldUseDevAuth();
    setIsDevMode(useDevAuth);

    console.log('🔧 AuthContext: Dev auth check:', useDevAuth);
    console.log('🔧 AuthContext: Current dev role:', devRole);

    if (useDevAuth) {
      console.log('🔧 Dev mode active: Bypassing Supabase authentication');
      // Use mock data based on current dev role
      const mockData = MOCK_USER_DATA[devRole];
      const enhancedProfile = devRole === 'teacher' 
        ? { ...mockData.profile, display_teacher_id: 'TCH001' }
        : mockData.profile;
      
      setUser(mockData.user as any);
      setProfile(enhancedProfile);
      setLoading(false);
      console.log(`🔧 Dev mode: Using ${devRole} role with data:`, enhancedProfile);
      return;
    }

    console.log('🔐 Production mode: Using Supabase authentication');

    // Set up auth state listener for real authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after authentication
          setTimeout(async () => {
            try {
              console.log('👤 Fetching profile for user:', session.user.id);
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (error) {
                console.error('❌ Error fetching profile:', error);
                if (error.code === 'PGRST116') {
                  console.log('📝 Profile not found, this might be a new user');
                }
              } else {
                console.log('✅ Profile loaded:', profileData);
                setProfile(profileData);
              }
            } catch (error) {
              console.error('❌ Error in profile fetch:', error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Checking existing session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [devRole]); // Re-run when dev role changes

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    if (shouldUseDevAuth()) {
      toast.success('Auth disabled in dev mode');
      return { error: null };
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      const successMessage = role === 'teacher' 
        ? 'Teacher account created successfully! A unique teacher ID has been assigned. Please check your email to verify your account.'
        : 'Account created successfully! Please check your email to verify your account.';
      
      toast.success(successMessage);
      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (shouldUseDevAuth()) {
      toast.success('Auth disabled in dev mode');
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Signin error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    if (shouldUseDevAuth()) {
      toast.success('Auth disabled in dev mode');
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (shouldUseDevAuth()) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated (dev mode)');
      return { error: null };
    }

    try {
      if (!user) {
        return { error: { message: 'No user logged in' } };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isDevMode,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
