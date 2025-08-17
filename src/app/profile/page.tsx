"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Mail, Calendar, Shield, Edit, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    avatarUrl: user?.user_metadata?.avatar_url || ''
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="space-y-6">
              <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleSave = () => {
    // TODO: Implement profile update logic
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      avatarUrl: user?.user_metadata?.avatar_url || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Profile Information</CardTitle>
                  <CardDescription>Your personal account details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={formData.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-2xl font-medium">
                      {formData.fullName?.charAt(0) || formData.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name
                      </Label>
                      {isEditing ? (
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formData.fullName || 'Not provided'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address
                      </Label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {formData.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Member Since
                      </Label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date().toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Status
                      </Label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-green-400" />
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Password</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last changed recently</p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current theme: {theme}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                    Manage
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
