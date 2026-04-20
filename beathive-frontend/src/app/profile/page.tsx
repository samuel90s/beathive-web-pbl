'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';

const BANKS = [
  { code: 'BCA',       name: 'BCA — Bank Central Asia' },
  { code: 'BRI',       name: 'BRI — Bank Rakyat Indonesia' },
  { code: 'BNI',       name: 'BNI — Bank Negara Indonesia' },
  { code: 'Mandiri',   name: 'Bank Mandiri' },
  { code: 'BSI',       name: 'BSI — Bank Syariah Indonesia' },
  { code: 'CIMB',      name: 'CIMB Niaga' },
  { code: 'Permata',   name: 'Bank Permata' },
  { code: 'BTN',       name: 'BTN — Bank Tabungan Negara' },
  { code: 'Danamon',   name: 'Bank Danamon' },
  { code: 'OCBC',      name: 'OCBC NISP' },
  { code: 'Maybank',   name: 'Maybank Indonesia' },
  { code: 'Mega',      name: 'Bank Mega' },
  { code: 'Panin',     name: 'Bank Panin' },
  { code: 'Jenius',    name: 'Jenius / BTPN' },
  { code: 'Jago',      name: 'Bank Jago' },
  { code: 'SeaBank',   name: 'SeaBank' },
  { code: 'Neo',       name: 'Bank Neo Commerce' },
  { code: 'Allo',      name: 'Allo Bank' },
  { code: 'BJB',       name: 'Bank BJB' },
  { code: 'Bukopin',   name: 'Bank Bukopin' },
  { code: 'Muamalat',  name: 'Bank Muamalat' },
  { code: 'Sinarmas',  name: 'Bank Sinarmas' },
  { code: 'GoPay',     name: 'GoPay' },
  { code: 'OVO',       name: 'OVO' },
  { code: 'DANA',      name: 'DANA' },
  { code: 'LinkAja',   name: 'LinkAja' },
  { code: 'ShopeePay', name: 'ShopeePay' },
];

export default function ProfilePage() {
  const isAuth = useRequireAuth();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [bankName, setBankName] = useState(user?.bankName ?? '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount ?? '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName ?? '');
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
        headers: { 'Content-Type': undefined },
      });
      setUser({ ...user, avatarUrl: data.avatarUrl });
    } catch {
      // silently fail
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { data } = await apiClient.patch('/auth/profile', {
        name: name.trim(),
        bio,
        bankName,
        bankAccount,
        bankAccountName,
      });
      setUser({
        ...user,
        name: data.name,
        bio: data.bio,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankAccountName: data.bankAccountName,
      });
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

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bio <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              placeholder="Tell people a bit about yourself..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email" value={user.email} disabled
              className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Payout Bank Account */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Payout Bank Account</p>
              <p className="text-xs text-gray-400 mb-3">
                Used for earnings withdrawal. Make sure the details are correct — payouts will be rejected if they don't match.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">Select bank...</option>
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
              <input
                type="text" value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder Name</label>
              <input
                type="text" value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Full name as registered at the bank"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Must match your bank records exactly. Withdrawal will be rejected if it doesn't match.
              </p>
            </div>
          </div>

          {profileMsg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${profileMsg.type === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit" disabled={savingProfile}
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
                  type="password" value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required placeholder="••••••••"
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
              type="submit" disabled={savingPw}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      {/* 2FA Section */}
      <TwoFactorSection isTwoFactorEnabled={!!user.isTwoFactorEnabled} />
    </div>
  );
}

function TwoFactorSection({ isTwoFactorEnabled }: { isTwoFactorEnabled: boolean }) {
  const [enabled, setEnabled] = useState(isTwoFactorEnabled);
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiClient.post('/auth/2fa/setup');
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setStep('setup');
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Failed to start 2FA setup' });
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await apiClient.post('/auth/2fa/verify', { token });
      setEnabled(true);
      setStep('idle');
      setQrCode(null);
      setSecret(null);
      setToken('');
      setMsg({ type: 'ok', text: '2FA enabled successfully!' });
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Invalid code, try again' });
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await apiClient.post('/auth/2fa/disable', { password });
      setEnabled(false);
      setPassword('');
      setStep('idle');
      setMsg({ type: 'ok', text: '2FA disabled.' });
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Failed to disable 2FA' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-400 mt-0.5">Add an extra layer of security to your account.</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${enabled ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg mb-4 ${msg.type === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </p>
      )}

      {!enabled && step === 'idle' && (
        <button
          onClick={startSetup}
          disabled={loading}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading...' : 'Enable 2FA'}
        </button>
      )}

      {step === 'setup' && qrCode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
          <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-gray-200 rounded-xl" />
          {secret && (
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">Or enter manually:</p>
              <p className="font-mono text-xs text-gray-700 break-all">{secret}</p>
            </div>
          )}
          <form onSubmit={verifySetup} className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              required
              maxLength={6}
              placeholder="6-digit code"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Verify'}
            </button>
          </form>
          <button onClick={() => setStep('idle')} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      )}

      {enabled && step === 'idle' && (
        <div>
          {step === 'idle' && (
            <button
              onClick={() => setStep('verify')}
              className="text-sm text-red-500 hover:text-red-600 hover:underline"
            >
              Disable 2FA
            </button>
          )}
        </div>
      )}

      {enabled && step === 'verify' && (
        <form onSubmit={disable2FA} className="space-y-3">
          <p className="text-sm text-gray-600">Enter your password to confirm disabling 2FA:</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Your password"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Disabling...' : 'Confirm Disable'}
            </button>
            <button type="button" onClick={() => setStep('idle')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
