'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthService, getAuthErrorMessage } from '@/lib/auth/authService'
import { useTheme } from '@/contexts/ThemeContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      await AuthService.resetPassword(email)
      
      setMessage('Password reset email sent! Please check your inbox and follow the instructions.')
      
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
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-md ${
              theme === 'dark'
                ? 'text-yellow-500 hover:text-yellow-400'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="text-center">
          <h2 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Forgot Password?
          </h2>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Enter your email address and we'll send you a link to reset your password
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
            <label htmlFor="email" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter your email"
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
                Sending Email...
              </div>
            ) : (
              'Send Reset Email'
            )}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Remember your password?{' '}
            <Link 
              href="/auth/login" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
