import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; success?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; success?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error(`Fetch profile attempt ${i + 1} failed:`, error);
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            continue;
          }
          return;
        }

        if (data) {
          setProfile(data as AppUser);
          return;
        }
      } catch (err) {
        console.error(`Fetch profile exception attempt ${i + 1}:`, err);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => { await fetchProfile(session.user.id); })();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }
      if (data?.user) {
        await fetchProfile(data.user.id);
      }
      return { error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion inconnue';
      console.error('Sign in exception:', err);
      return { error: message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Starting signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'user',
          },
        },
      });

      if (error) {
        console.error('Sign up auth error:', error);
        return { error: `Erreur d'authentification: ${error.message}` };
      }

      if (!data?.user) {
        console.error('No user returned from signup');
        return { error: 'Erreur: Impossible de créer le compte utilisateur' };
      }

      console.log('User created successfully:', data.user.id);

      // Wait for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchProfile(data.user.id);

      return { error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'inscription inconnue';
      console.error('Sign up exception:', err);
      return { error: message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
