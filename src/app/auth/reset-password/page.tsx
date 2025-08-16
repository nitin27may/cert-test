'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthService, getAuthErrorMessage } from '@/lib/auth/authService'
import { useTheme } from '@/contexts/ThemeContext'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      await AuthService.updatePassword(password)
      
      setMessage('Password updated successfully! Redirecting to dashboard...')
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (error: any) {
      setError(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full space-y-8 p-8 rounded-lg shadow-lg ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Reset Your Password
          </h2>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Enter your new password below
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="password" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter new password"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Password...
              </div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
