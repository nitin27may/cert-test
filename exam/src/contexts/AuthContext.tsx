'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthService, type AuthUser } from '@/lib/auth/authService'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('Getting initial session...')
      try {
        const session = await AuthService.getSession()
        console.log('Initial session:', session?.user?.email)
        setSession(session)
        
        if (session?.user) {
          const user = await AuthService.getCurrentUser()
          console.log('Initial user set:', user?.email)
          setUser(user)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        console.log('Setting initial loading to false')
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        console.log('Auth state change - full session:', session);
        setSession(session)
        
        if (session?.user) {
          try {
            console.log('AuthContext: Creating user object from session...');
            // Use the user data directly from the session instead of making another API call
            const user: AuthUser = {
              id: session.user.id,
              email: session.user.email!,
              user_metadata: session.user.user_metadata
            }
            console.log('AuthContext: Created user object:', user);
            console.log('AuthContext: Setting user after state change:', user.email);
            setUser(user)
            console.log('AuthContext: User state updated successfully');
          } catch (error) {
            console.error('Error creating user object:', error)
            setUser(null)
          }
        } else {
          console.log('No session, clearing user');
          setUser(null)
        }
        
        console.log('AuthContext: Setting loading to false after state change');
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      await AuthService.signUp(email, password)
      // Don't set loading to false here - let auth state change handle it
    } catch (error) {
      setLoading(false) // Only set loading to false on error
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log('AuthContext: Starting sign in...')
      const result = await AuthService.signIn(email, password)
      console.log('AuthContext: Sign in result:', result?.user?.email)
      
      // Don't manually update state here - let the auth state change listener handle it
      // The SIGNED_IN event should trigger and update the user state
      
      return result
    } catch (error) {
      console.error('AuthContext: Sign in error:', error)
      setLoading(false) // Only set loading to false on error
      throw error
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      await AuthService.signInWithGoogle()
      // Don't set loading to false here - OAuth redirect will handle navigation
    } catch (error) {
      setLoading(false) // Only set loading to false on error
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await AuthService.signOut()
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    await AuthService.resetPassword(email)
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
