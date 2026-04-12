import { useState, useRef } from 'react';

interface Props {
  onImport: (file: File, mode: 'athletes' | 'full') => void;
  onClose: () => void;
}

export function ImportDialog({ onImport, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'athletes' | 'full'>('athletes');
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    onImport(file, mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--bg-overlay)]" />
      <div
        className="relative bg-[var(--bg-surface)] rounded-2xl shadow-2xl mx-4 w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--text-primary)]">Import from Excel</h3>

        {/* File picker */}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-[var(--border-input)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--border-male-strong)] hover:text-blue-500"
        >
          {file ? file.name : 'Choose .xlsx file'}
        </button>

        {/* Import mode */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Import mode</div>
          <button
            onClick={() => setMode('athletes')}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 ${
              mode === 'athletes' ? 'border-blue-500 bg-[var(--bg-male)]' : 'border-[var(--border-default)]'
            }`}
          >
            <div className="text-sm font-semibold">Only Athletes</div>
            <div className="text-xs text-[var(--text-secondary)]">Update athlete info (names, weights, gender, year). Keeps current boat layouts.</div>
          </button>
          <button
            onClick={() => setMode('full')}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 ${
              mode === 'full' ? 'border-blue-500 bg-[var(--bg-male)]' : 'border-[var(--border-default)]'
            }`}
          >
            <div className="text-sm font-semibold">Full Import</div>
            <div className="text-xs text-[var(--text-secondary)]">Replace everything: athletes, races, and boat layouts.</div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg ${
              file && !importing ? 'bg-blue-600 text-white' : 'bg-[var(--border-default)] text-[var(--text-muted)]'
            }`}
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
