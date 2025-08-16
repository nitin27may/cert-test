'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Starting auth callback handling...')
        console.log('AuthCallback: Current URL:', window.location.href)
        
        // For OAuth callbacks, we need to handle the hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          console.log('AuthCallback: Found tokens in URL hash, setting session...')
          
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('Auth callback error setting session:', error)
            setError(error.message)
            setTimeout(() => {
              router.push('/auth/login?error=callback_error')
            }, 2000)
            return
          }

          console.log('AuthCallback: Session set successfully:', data.session?.user?.email)
          
          // Clear the hash from URL
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Redirect to dashboard
          router.push('/dashboard')
        } else {
          console.log('AuthCallback: No tokens found in URL, checking existing session...')
          
          // Fallback: check if there's already a session
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error getting session:', error)
            setError(error.message)
            setTimeout(() => {
              router.push('/auth/login?error=callback_error')
            }, 2000)
            return
          }

          if (data.session) {
            console.log('AuthCallback: Found existing session, redirecting to dashboard')
            router.push('/dashboard')
          } else {
            console.log('AuthCallback: No session found, redirecting to login')
            router.push('/auth/login')
          }
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        setError('An unexpected error occurred')
        setTimeout(() => {
          router.push('/auth/login?error=unexpected_error')
        }, 2000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 mb-2">Authentication Error</p>
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-gray-500 mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Completing authentication...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
