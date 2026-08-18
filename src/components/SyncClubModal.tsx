import { useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
  onSynced: () => void;
}

// Pulls membership numbers from club.motion.rs and matches them to this team's
// athletes by name. Shows a dry-run preview before applying anything.
export function SyncClubModal({ onClose, onSynced }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<api.ClubSyncReport | null>(null);

  const preview = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      setReport(await api.syncClubMembers(email, password, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    setError('');
    try {
      const res = await api.syncClubMembers(email, password, false);
      onSynced();
      onClose();
      alert(`${res.matchedCount} member ID${res.matchedCount === 1 ? '' : 's'} applied.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Sync from Club</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {!report ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Log in to club.motion.rs to match members to this team's athletes by name and fill their membership numbers.
            </p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full px-3 py-2 text-sm border rounded-lg"
              autoFocus
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full px-3 py-2 text-sm border rounded-lg"
              onKeyDown={e => e.key === 'Enter' && preview()}
            />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              onClick={preview}
              disabled={loading || !email || !password}
              className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Preview match'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-xs">
                <span><b className="text-[var(--text-primary)]">{report.matchedCount}</b> will be matched</span>
                <span className="text-[var(--text-muted)]">of {report.totalMembers} club members</span>
              </div>

              <Section title={`Matched (${report.matched.length})`} tone="ok">
                {report.matched.map(m => (
                  <Row key={`m${m.membership_number}`} left={`#${m.membership_number}`} right={m.name} />
                ))}
              </Section>

              {report.ambiguous.length > 0 && (
                <Section title={`Ambiguous — skipped (${report.ambiguous.length})`} tone="warn">
                  {report.ambiguous.map(m => (
                    <Row key={`a${m.membership_number}`} left={`#${m.membership_number}`} right={m.name} />
                  ))}
                </Section>
              )}

              {report.membersWithoutAthlete.length > 0 && (
                <Section title={`In club app, no athlete here (${report.membersWithoutAthlete.length})`} tone="warn">
                  {report.membersWithoutAthlete.map(m => (
                    <Row key={`w${m.membership_number}`} left={`#${m.membership_number}`} right={m.name} />
                  ))}
                </Section>
              )}

              {report.athletesWithoutMember.length > 0 && (
                <Section title={`Athletes with no club match (${report.athletesWithoutMember.length})`} tone="muted">
                  {report.athletesWithoutMember.map(a => (
                    <Row key={`n${a.id}`} left="" right={a.name} />
                  ))}
                </Section>
              )}

              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={apply}
                disabled={applying || report.matchedCount === 0}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {applying ? 'Applying…' : `Apply ${report.matchedCount} ID${report.matchedCount === 1 ? '' : 's'}`}
              </button>
              <button onClick={() => setReport(null)} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] rounded-lg">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: 'ok' | 'warn' | 'muted'; children: ReactNode }) {
  const color = tone === 'ok' ? 'text-green-700' : tone === 'warn' ? 'text-amber-700' : 'text-[var(--text-muted)]';
  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${color} mb-1`}>{title}</div>
      <div className="divide-y rounded-lg border border-[var(--border-default)] overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-[var(--bg-surface)]">
      {left && <span className="text-xs tabular-nums text-[var(--text-muted)] w-10 flex-shrink-0">{left}</span>}
      <span className="text-sm text-[var(--text-primary)] truncate">{right}</span>
    </div>
  );
}
