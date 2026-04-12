import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  removed: 'bg-orange-100 text-orange-700',
  restored: 'bg-teal-100 text-teal-700',
  reordered: 'bg-purple-100 text-purple-700',
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Activity Log</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No activity yet</div>
          ) : (
            <div className="divide-y">
              {entries.map(e => (
                <div key={e.id} className="px-4 py-2.5 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[e.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {e.action}
                    </span>
                    <span className="text-[10px] text-gray-400">{e.entity_type}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{formatTime(e.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-800">
                    {e.entity_name && <span className="font-medium">{e.entity_name}</span>}
                    {e.details && <span className="text-gray-500 ml-1 text-xs">({e.details})</span>}
                  </div>
                  <div className="text-[10px] text-gray-400">by {e.user_name ?? 'system'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
