import { useMemo, useState } from 'react';
import type { Athlete } from '../types';

interface Props {
  athletes: Athlete[];
  teamName?: string | null;
  onClose: () => void;
}

function buildSection(label: string, names: string[]): string {
  const header = `${label} (${names.length}):`;
  if (names.length === 0) return `${header}\n-`;
  return [header, ...names.map((n, i) => `${i + 1}. ${n}`)].join('\n');
}

export function ExportAthletesModal({ athletes, teamName, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  // Only registered, non-removed athletes — the competitors for this competition.
  const registered = athletes.filter(a => a.isRegistered && !a.isRemoved);
  const males = registered.filter(a => a.gender === 'M').map(a => a.name).sort((a, b) => a.localeCompare(b));
  const females = registered.filter(a => a.gender === 'F').map(a => a.name).sort((a, b) => a.localeCompare(b));

  const text = useMemo(() => {
    const lines: string[] = [];
    if (teamName) lines.push(teamName, '');
    lines.push(buildSection('Male', males), '', buildSection('Female', females));
    return lines.join('\n');
  }, [teamName, males, females]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('Copy failed — select the text and copy manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--bg-app)] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-[var(--bg-surface)] border-b">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Export competitors ({registered.length})
        </h2>
        <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-2">&times;</button>
      </div>

      <div className="px-4 py-2 bg-[var(--bg-surface)] border-b">
        <button
          onClick={handleCopy}
          className="w-full py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
        >
          {copied ? 'Copied ✓' : 'Copy to clipboard'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <pre className="whitespace-pre-wrap break-words text-sm text-[var(--text-primary)] font-mono">
{text}
        </pre>
      </div>
    </div>
  );
}
