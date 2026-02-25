'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';

interface University {
  id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function UniversityDetailPage() {
  const [university, setUniversity] = useState<University | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('teacher');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const load = async () => {
    const { data: uni } = await supabase
      .from('universities')
      .select('*')
      .eq('id', id)
      .single();
    setUniversity(uni);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('university_id', id)
      .order('created_at', { ascending: false });
    setUsers(profiles || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

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
      body: JSON.stringify({ fullName, email, password, role, universityId: id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Ошибка при создании пользователя');
      setSaving(false);
      return;
    }

    setSuccess(`Пользователь ${fullName} успешно создан!`);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('teacher');
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
            <button
              onClick={() => router.push('/dashboard/universities')}
              className="text-gray-600 hover:text-amber-400 transition-colors text-sm"
            >
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
            onClick={() => setShowForm(!showForm)}
            className="text-xs px-4 py-2 rounded transition-all"
            style={{ background: '#f59e0b', color: '#080810', fontWeight: 600 }}
          >
            + Добавить пользователя
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs tracking-[0.4em] text-amber-500 uppercase mb-2">Университет</p>
          <h1 className="font-display text-4xl text-white">{university?.name}</h1>
          {university?.domain && (
            <p className="text-gray-600 text-sm mt-1">@{university.domain}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Всего пользователей', value: users.length },
            { label: 'Преподавателей', value: users.filter(u => u.role === 'teacher').length },
            { label: 'Студентов', value: users.filter(u => u.role === 'student').length },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-5">
              <p className="text-2xl text-amber-400 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-600 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
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
                  placeholder="ivan@narxoz.kz"
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
                  <option value="admin">Администратор</option>
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
                className="px-6 py-2 rounded text-sm font-semibold transition-all"
                style={{ background: '#f59e0b', color: '#080810' }}
              >
                {saving ? 'Создаём...' : 'Создать'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(''); setSuccess(''); }}
                className="px-6 py-2 rounded text-sm border border-[#1e1e30] text-gray-500 hover:text-white transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Users list */}
        {users.length === 0 ? (
          <div className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-12 text-center">
            <p className="text-gray-600 text-sm">Нет пользователей. Добавьте первого!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold"
                    style={{ borderColor: roleColors[user.role] + '40', color: roleColors[user.role], background: roleColors[user.role] + '10' }}
                  >
                    {user.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{user.full_name}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] px-2 py-1 rounded border"
                  style={{ color: roleColors[user.role], borderColor: roleColors[user.role] + '40', background: roleColors[user.role] + '10' }}
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
