import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-[var(--bg-badge-side)] text-[var(--text-badge-side)]',
  updated: 'bg-[var(--bg-male-strong)] text-blue-700',
  deleted: 'bg-[var(--bg-role-admin)] text-[var(--text-role-admin)]',
  removed: 'bg-orange-100 text-orange-700',
  restored: 'bg-teal-100 text-teal-700',
  reordered: 'bg-[var(--bg-badge-bcp)] text-[var(--text-badge-bcp)]',
  duplicated: 'bg-indigo-100 text-indigo-700',
  imported: 'bg-yellow-100 text-yellow-700',
  copied: 'bg-cyan-100 text-cyan-700',
};

export function ActivityLogPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<api.ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.fetchActivityLog(100);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Activity Log</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-[var(--text-muted)] py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-8">No activity yet</div>
          ) : (
            <div className="divide-y">
              {entries.map(e => (
                <div key={e.id} className="px-4 py-2.5 hover:bg-[var(--bg-surface-alt)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[e.action] ?? 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'}`}>
                      {e.action}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{e.entity_type}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto">{formatTime(e.created_at)}</span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">
                    {e.entity_name && <span className="font-medium">{e.entity_name}</span>}
                    {e.details && <span className="text-[var(--text-secondary)] ml-1 text-xs">({e.details})</span>}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">by {e.user_name ?? 'system'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
