'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  full_name: string;
  role: string;
  university_id: string | null;
  created_at: string;
  universities?: { name: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [profile, setProfile] = useState<{ role: string; university_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('teacher');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: prof } = await supabase
      .from('profiles')
      .select('role, university_id')
      .eq('id', user.id)
      .single();

    setProfile(prof);

    if (!['superadmin', 'admin'].includes(prof?.role || '')) {
      router.push('/dashboard');
      return;
    }

    const query = supabase
      .from('profiles')
      .select('*, universities(name)')
      .neq('role', 'superadmin')
      .order('created_at', { ascending: false });

    if (prof?.role === 'admin' && prof.university_id) {
      query.eq('university_id', prof.university_id);
    }

    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateUser = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role,
        universityId: profile?.university_id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Ошибка при создании');
      setSaving(false);
      return;
    }

    setSuccess(`${fullName} успешно добавлен!`);
    setFullName(''); setEmail(''); setPassword(''); setRole('teacher');
    setShowForm(false);
    setSaving(false);
    load();
  };

  const roleColors: Record<string, string> = {
    admin: '#818cf8',
    teacher: '#34d399',
    student: '#94a3b8',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Администратор',
    teacher: 'Преподаватель',
    student: 'Студент',
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-[#1e1e30] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-amber-400 transition-colors text-sm">
              ← Назад
            </button>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-amber-500/60 rotate-45 flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rotate-[-45deg]" />
              </div>
              <span className="font-display text-xl tracking-[0.15em] text-white">VERIDOC</span>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
            className="text-xs px-4 py-2 rounded transition-all"
            style={{ background: '#f59e0b', color: '#080810', fontWeight: 600 }}
          >
            + Добавить пользователя
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">Управление</p>
          <h1 className="font-display text-4xl text-white">Пользователи</h1>
        </div>

        {/* Add user form */}
        {showForm && (
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-6 mb-8 animate-fade-in-up">
            <p className="text-sm text-white font-semibold mb-4">Новый пользователь</p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Полное имя *</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Email *</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan@university.kz"
                  className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Пароль *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Роль *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'teacher' | 'student')}
                  className="w-full bg-[#080810] border border-[#1e1e30] rounded px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-amber-500/40 transition-colors font-mono"
                >
{profile?.role === 'superadmin' && (
  <option value="admin">Администратор</option>)}
<option value="teacher">Преподаватель</option>
<option value="student">Студент</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4">
                <p className="text-red-400 text-xs">⚠ {error}</p>
              </div>
            )}
            {success && (
              <div className="rounded border border-green-500/30 bg-green-500/5 px-4 py-3 mb-4">
                <p className="text-green-400 text-xs">✓ {success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreateUser}
                disabled={saving}
                className="px-6 py-2 rounded text-sm font-semibold"
                style={{ background: '#f59e0b', color: '#080810' }}
              >
                {saving ? 'Создаём...' : 'Создать'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-6 py-2 rounded text-sm border border-[#1e1e30] text-gray-500 hover:text-white transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Администраторов', value: users.filter(u => u.role === 'admin').length, color: '#818cf8' },
            { label: 'Преподавателей', value: users.filter(u => u.role === 'teacher').length, color: '#34d399' },
            { label: 'Студентов', value: users.filter(u => u.role === 'student').length, color: '#94a3b8' },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-5">
              <p className="text-2xl font-semibold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-gray-600 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'admin', 'teacher', 'student'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs rounded border transition-all"
              style={{
                background: filter === f ? '#f59e0b' : 'transparent',
                color: filter === f ? '#080810' : '#6b7280',
                borderColor: filter === f ? '#f59e0b' : '#1e1e30',
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === 'all' ? 'Все' : roleLabels[f]}
            </button>
          ))}
          <span className="text-xs text-gray-600 ml-2">{filtered.length} пользователей</span>
        </div>

        {/* Users list */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-12 text-center">
            <p className="text-gray-600 text-sm">Нет пользователей</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <div key={user.id} className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-4 flex items-center justify-between hover:border-amber-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-full border flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{
                      borderColor: roleColors[user.role] + '40',
                      color: roleColors[user.role],
                      background: roleColors[user.role] + '10',
                    }}
                  >
                    {user.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{user.full_name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {user.universities?.name && (
                        <span className="text-amber-500/70">{user.universities.name} · </span>
                      )}
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] px-2 py-1 rounded border"
                  style={{
                    color: roleColors[user.role],
                    borderColor: roleColors[user.role] + '40',
                    background: roleColors[user.role] + '10',
                  }}
                >
                  {roleLabels[user.role]}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
