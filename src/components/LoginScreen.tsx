import { useState } from 'react';
import { login } from '../utils/api';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-1">Dragon Boat</h1>
        <p className="text-center text-[var(--text-muted)] text-sm mb-6">Crew Layout Manager</p>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl outline-none focus:border-[var(--border-male-strong)] text-base"
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl outline-none focus:border-[var(--border-male-strong)] text-base"
              placeholder="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white ${
              loading ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
