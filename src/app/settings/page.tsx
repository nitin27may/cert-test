"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Palette, Bell, Keyboard, Eye, Moon, Sun, Monitor, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const router = useRouter();
  const [settings, setSettings] = useState({
    theme: theme,
    keyboardNavigation: true,
    showDetailedExplanations: true,
    autoSaveInterval: 30,
    notifications: {
      examReminders: true,
      scoreUpdates: true,
      studyReminders: false,
      emailNotifications: true
    }
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
    // TODO: Implement settings save logic
    console.log('Saving settings:', settings);
    // Update theme if changed
    if (settings.theme !== theme) {
      setTheme(settings.theme);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setSettings({ ...settings, theme: newTheme as 'light' | 'dark' | 'system' });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Customize your experience</p>
              </div>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how the application looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Theme</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color scheme</p>
                </div>
                <Select value={settings.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Detailed Explanations</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show detailed explanations for exam questions</p>
                </div>
                <Switch
                  checked={settings.showDetailedExplanations}
                  onCheckedChange={(checked) => setSettings({ ...settings, showDetailedExplanations: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accessibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Accessibility
              </CardTitle>
              <CardDescription>Make the application more accessible for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Keyboard Navigation</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable keyboard shortcuts and navigation</p>
                </div>
                <Switch
                  checked={settings.keyboardNavigation}
                  onCheckedChange={(checked) => setSettings({ ...settings, keyboardNavigation: checked })}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Auto-save Interval</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">How often to automatically save your progress (seconds)</p>
                </div>
                <Input
                  type="number"
                  value={settings.autoSaveInterval}
                  onChange={(e) => setSettings({ ...settings, autoSaveInterval: parseInt(e.target.value) || 30 })}
                  className="w-24"
                  min="10"
                  max="300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>Manage how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Exam Reminders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get reminded about upcoming exams</p>
                </div>
                <Switch
                  checked={settings.notifications.examReminders}
                  onCheckedChange={(checked) => handleNotificationChange('examReminders', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Score Updates</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications when your scores are updated</p>
                </div>
                <Switch
                  checked={settings.notifications.scoreUpdates}
                  onCheckedChange={(checked) => handleNotificationChange('scoreUpdates', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Study Reminders</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get daily study reminders</p>
                </div>
                <Switch
                  checked={settings.notifications.studyReminders}
                  onCheckedChange={(checked) => handleNotificationChange('studyReminders', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive important updates via email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>Quick reference for keyboard navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Next Question</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">→</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Previous Question</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">←</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Submit Answer</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Flag Question</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">F</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Toggle Theme</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">T</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Save Progress</span>
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl+S</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
