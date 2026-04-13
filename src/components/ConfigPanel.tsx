import { useState } from 'react';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

export function ConfigPanel({ config, onSave, onClose }: Props) {
  const [year, setYear] = useState(String(config.competitionYear));

  const handleSave = () => {
    onSave({
      ...config,
      competitionYear: parseInt(year) || 2026,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-[var(--bg-surface)] border-b">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Settings</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-2">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Competition year */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Competition Year</div>
          <input
            value={year}
            onChange={e => setYear(e.target.value)}
            type="number"
            className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
          />
          <div className="text-xs text-[var(--text-muted)] mt-1">Used to calculate athlete age from year of birth</div>
        </div>

        {/* Mixed ratio (read-only, set per competition) */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Mixed Boat Ratio</div>
          <div className="text-xs text-[var(--text-muted)] mb-3">Set per competition in Competitions & Teams</div>
          <div className="bg-[var(--bg-surface)] rounded-lg border p-3 text-sm text-[var(--text-secondary)]">
            <div className="flex justify-between mb-1">
              <span>Standard (20p)</span>
              <span>{config.genderPolicy.mixedRatio.standard.minSameGender}–{config.genderPolicy.mixedRatio.standard.maxSameGender} per gender</span>
            </div>
            <div className="flex justify-between">
              <span>Small (10p)</span>
              <span>{config.genderPolicy.mixedRatio.small.minSameGender}–{config.genderPolicy.mixedRatio.small.maxSameGender} per gender</span>
            </div>
          </div>
        </div>

        {/* Age categories (read-only display) */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Age Categories</div>
          <div className="bg-[var(--bg-surface)] rounded-lg border divide-y">
            {config.ageCategoryRules.map(rule => (
              <div key={rule.category} className="flex justify-between px-3 py-2 text-sm">
                <span className="font-medium">{rule.category}</span>
                <span className="text-[var(--text-muted)]">
                  {rule.minAge && rule.maxAge
                    ? `${rule.minAge}–${rule.maxAge}`
                    : rule.minAge
                    ? `${rule.minAge}+`
                    : rule.maxAge
                    ? `≤ ${rule.maxAge}`
                    : 'No restriction'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-[var(--bg-surface)] border-t">
        <button onClick={handleSave} className="w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg font-medium">
          Save Settings
        </button>
      </div>
    </div>
  );
}
