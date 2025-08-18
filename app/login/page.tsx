'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const USERS = {
  aastha: 'aastha-truehue',
  dhruvi: 'dhruvi-truehue',
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<'aastha' | 'dhruvi' | ''>('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!user) return setErr('Pick a user');
    if (password !== USERS[user]) return setErr('Invalid password');

    // set cookie for 30 days; sameSite=Lax so middleware can read it
    document.cookie = `th_auth=${user}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`;
    // optional local persistence
    localStorage.setItem('th_user', user);
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-[#ab1f10] mb-4">TrueHue — Login</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#ab1f10] mb-1">User</label>
            <select
              className="w-full p-3 border border-rose-200 rounded text-black"
              value={user}
              onChange={(e) => setUser(e.target.value as any)}
            >
              <option value="">Select User</option>
              <option value="aastha">aastha</option>
              <option value="dhruvi">dhruvi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#ab1f10] mb-1">Password</label>
            <input
              type="password"
              className="w-full p-3 border border-rose-200 rounded text-black"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            type="submit"
            className="w-full px-4 py-3 bg-[#ab1f10] text-white rounded hover:bg-red-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
