import { useState } from 'react';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

export function ConfigPanel({ config, onSave, onClose }: Props) {
  const [year, setYear] = useState(String(config.competitionYear));
  const [stdMin, setStdMin] = useState(String(config.genderPolicy.mixedRatio.standard.minSameGender));
  const [stdMax, setStdMax] = useState(String(config.genderPolicy.mixedRatio.standard.maxSameGender));
  const [smMin, setSmMin] = useState(String(config.genderPolicy.mixedRatio.small.minSameGender));
  const [smMax, setSmMax] = useState(String(config.genderPolicy.mixedRatio.small.maxSameGender));

  const handleSave = () => {
    onSave({
      ...config,
      competitionYear: parseInt(year) || 2026,
      genderPolicy: {
        mixedRatio: {
          standard: { minSameGender: parseInt(stdMin) || 0, maxSameGender: parseInt(stdMax) || 20 },
          small: { minSameGender: parseInt(smMin) || 0, maxSameGender: parseInt(smMax) || 10 },
        },
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white border-b">
        <h2 className="text-base font-bold text-gray-800">Settings</h2>
        <button onClick={onClose} className="text-gray-400 text-xl px-2">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Competition year */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Competition Year</div>
          <input
            value={year}
            onChange={e => setYear(e.target.value)}
            type="number"
            className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400"
          />
          <div className="text-xs text-gray-400 mt-1">Used to calculate athlete age from year of birth</div>
        </div>

        {/* Mixed ratio */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Mixed Boat Ratio</div>
          <div className="text-xs text-gray-400 mb-3">Min and max of <strong>either gender</strong> in a mixed crew</div>

          <div className="bg-white rounded-lg border p-3 mb-2">
            <div className="text-sm font-medium mb-2">Standard boat (20 paddlers)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Min either gender</label>
                <input
                  value={stdMin}
                  onChange={e => setStdMin(e.target.value)}
                  type="number"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
                />
              </div>
              <span className="text-gray-300 pt-4">—</span>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Max either gender</label>
                <input
                  value={stdMax}
                  onChange={e => setStdMax(e.target.value)}
                  type="number"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-3">
            <div className="text-sm font-medium mb-2">Small boat (10 paddlers)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Min either gender</label>
                <input
                  value={smMin}
                  onChange={e => setSmMin(e.target.value)}
                  type="number"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
                />
              </div>
              <span className="text-gray-300 pt-4">—</span>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Max either gender</label>
                <input
                  value={smMax}
                  onChange={e => setSmMax(e.target.value)}
                  type="number"
                  className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Age categories (read-only display) */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Age Categories</div>
          <div className="bg-white rounded-lg border divide-y">
            {config.ageCategoryRules.map(rule => (
              <div key={rule.category} className="flex justify-between px-3 py-2 text-sm">
                <span className="font-medium">{rule.category}</span>
                <span className="text-gray-400">
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

      <div className="px-4 py-3 bg-white border-t">
        <button onClick={handleSave} className="w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg font-medium">
          Save Settings
        </button>
      </div>
    </div>
  );
}
