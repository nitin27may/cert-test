import { supabase } from '../supabase'
import type { User, AuthError, AuthResponse } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) throw error
    return data
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  // Sign in with Google
  static async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    
    if (error) throw error
    return data
  }

  // Reset password
  static async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    
    if (error) throw error
    return data
  }

  // Update password
  static async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password
    })
    
    if (error) throw error
    return data
  }

  // Sign out
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Get current user
  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error
    
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email!,
      user_metadata: user.user_metadata
    }
  }

  // Get session
  static async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  }

  // Listen to auth changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Auth error handling
export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please check your email and click the confirmation link'
    case 'User already registered':
      return 'An account with this email already exists'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long'
    default:
      return error.message || 'An error occurred during authentication'
  }
}
