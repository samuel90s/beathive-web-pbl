'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ProfilePage() {
  const isAuth = useRequireAuth();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  if (!isAuth || !user) return null;

  const avatarSrc = user.avatarUrl
    ? user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `http://localhost:3000${user.avatarUrl}`
    : null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await apiClient.post('/auth/avatar', form, {
        headers: { 'Content-Type': undefined }, // let axios set multipart/form-data + boundary automatically
      });
      setUser({ ...user, avatarUrl: data.avatarUrl });
    } catch {
      // silently fail — avatar is optional
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { data } = await apiClient.patch('/auth/profile', { name: name.trim(), bio });
      setUser({ ...user, name: data.name, bio: data.bio });
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSavingPw(true);
    try {
      await apiClient.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ type: 'ok', text: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwMsg({ type: 'err', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>

      {/* Avatar + basic info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Profile Information</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              {avatarSrc ? (
                <Image src={avatarSrc} alt="avatar" width={80} height={80} className="object-cover w-full h-full" unoptimized />
              ) : (
                <span className="text-2xl font-semibold text-violet-600">{user.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={uploadingAvatar}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, or WebP · Max 5MB</p>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Name + Bio form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell people a bit about yourself..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          {profileMsg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${profileMsg.type === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Change Password</h2>

        {user.provider === 'google' ? (
          <p className="text-sm text-gray-400">Your account uses Google login — password change is not available.</p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'Current Password', value: currentPw, onChange: setCurrentPw },
              { label: 'New Password', value: newPw, onChange: setNewPw },
              { label: 'Confirm New Password', value: confirmPw, onChange: setConfirmPw },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPw}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
