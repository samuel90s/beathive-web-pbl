'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { mediaUrl } from '@/lib/utils';
import SoundRow from '@/components/sounds/SoundRow';
import type { SoundEffect } from '@/types';

interface CreatorProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  soundCount: number;
  sounds: SoundEffect[];
}

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/auth/users/${id}`)
      .then(res => setProfile(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Creator not found.</p>
      </div>
    );
  }

  const initials = profile.name?.charAt(0).toUpperCase() ?? '?';
  const joinYear = new Date(profile.createdAt).getFullYear();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profile.avatarUrl
            ? <img src={mediaUrl(profile.avatarUrl)} alt={profile.name} className="w-full h-full object-cover" />
            : <span className="text-3xl font-bold text-violet-600">{initials}</span>
          }
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {profile.soundCount} sound{profile.soundCount !== 1 ? 's' : ''} · Member since {joinYear}
          </p>
        </div>
      </div>

      {/* Sounds */}
      {profile.sounds.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No published sounds yet.</p>
      ) : (
        <div className="space-y-2">
          {profile.sounds.map(sound => (
            <SoundRow key={sound.id} sound={sound} />
          ))}
        </div>
      )}
    </div>
  );
}
