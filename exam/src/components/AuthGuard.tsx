'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Debug: Log auth state
  console.log('AuthGuard - loading:', loading, 'user:', !!user, 'requireAuth:', requireAuth);

  useEffect(() => {
    if (loading) return

    if (requireAuth && !user) {
      // If auth is required but user is not logged in, redirect to login
      router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`)
    } else if (!requireAuth && user) {
      // If user is logged in but trying to access auth pages, redirect to dashboard
      router.push('/dashboard')
    }
  }, [user, loading, requireAuth, router, redirectTo, pathname])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render children if auth requirement is not met
  if (requireAuth && !user) {
    return null
  }

  if (!requireAuth && user) {
    return null
  }

  return <>{children}</>
}
