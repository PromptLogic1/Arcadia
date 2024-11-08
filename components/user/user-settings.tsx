'use client';

import { useState } from 'react';
import type { Tables } from '@/types/database.types';

interface UserSettingsProps {
  userId: string;
  userData: Tables['users']['Row'];
}

export default function UserSettings({ userId, userData }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'privacy' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Privacy
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-2 rounded ${
                activeTab === 'notifications' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              Notifications
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {activeTab === 'general' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">General Settings</h2>
              <p className="text-gray-600">General settings placeholder content</p>
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
              <p className="text-gray-600">Profile settings placeholder content</p>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
              <p className="text-gray-600">Privacy settings placeholder content</p>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
              <p className="text-gray-600">Notification settings placeholder content</p>
            </div>
          )}

          {userId && (
            <div className="mt-6 pt-4 border-t text-sm text-gray-500">
              User ID: {userId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 