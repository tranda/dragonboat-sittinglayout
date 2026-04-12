import { useState } from 'react';
import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onClose: () => void;
}

function generateHtml(races: Race[], layouts: Record<string, BoatLayout>, athleteMap: Map<number, Athlete>): string {
  const getName = (id: number | null) => {
    if (id === null) return '';
    return athleteMap.get(id)?.name ?? '?';
  };
  const getWeight = (id: number | null) => {
    if (id === null) return '';
    const w = athleteMap.get(id)?.weight;
    return w ? `${w}` : '';
  };

  const pages = races.map(race => {
    const layout = layouts[race.id];
    if (!layout) return '';

    const paddlersFilled = layout.left.filter(Boolean).length + layout.right.filter(Boolean).length;
    const totalPaddlers = race.numRows * 2;

    let rows = '';

    // Drummer
    rows += `<tr style="background:#fff8eb"><td class="seat">DR</td><td colspan="2">${getName(layout.drummer)}</td><td colspan="2"></td></tr>`;

    // Paddlers
    for (let i = 0; i < race.numRows; i++) {
      rows += `<tr>
        <td class="seat">${i + 2}</td>
        <td class="name">${getName(layout.left[i])}</td>
        <td class="kg">${getWeight(layout.left[i])}</td>
        <td class="name">${getName(layout.right[i])}</td>
        <td class="kg">${getWeight(layout.right[i])}</td>
      </tr>`;
    }

    // Helm
    rows += `<tr style="background:#fff8eb"><td class="seat">HM</td><td colspan="2"></td><td colspan="2">${getName(layout.helm)}</td></tr>`;

    const reserves = layout.reserves.length > 0
      ? `<p style="margin-top:8px"><b>Reserves:</b> ${layout.reserves.map(id => getName(id)).filter(Boolean).join(', ')}</p>`
      : '';

    return `
      <div class="page">
        <h2>${race.name}</h2>
        <p class="sub">${race.boatType === 'standard' ? 'Standard (20)' : 'Small (10)'} · ${race.distance} · ${paddlersFilled}/${totalPaddlers} paddlers</p>
        <table>
          <thead><tr><th style="width:30px">Seat</th><th>Left</th><th style="width:40px">kg</th><th>Right</th><th style="width:40px">kg</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${reserves}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Crew Sheets</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #222; }
  .page { padding: 20mm 15mm; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h2 { font-size: 18px; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #888; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; white-space: nowrap; letter-spacing: normal; }
  th { background: #f0f0f0; font-weight: 600; color: #555; }
  .seat { text-align: center; color: #999; font-size: 10px; width: 30px; }
  .name { font-weight: 500; white-space: nowrap; }
  .kg { text-align: right; color: #999; width: 40px; }
  p { font-size: 12px; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>
<div class="no-print" style="position:sticky;top:0;z-index:10;padding:12px 20px;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;background:#f8f8f8">
  <span style="font-size:13px;color:#666">Tap Print or use Share &rarr; Print to save as PDF.</span>
  <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print</button>
</div>
${pages}
</body></html>`;
}

export function PdfExportModal({ races, layouts, athleteMap, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(races.map(r => r.id)));

  const toggleRace = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(races.map(r => r.id)));
  const selectNone = () => setSelected(new Set());

  const handleGenerate = () => {
    const selectedRaces = races.filter(r => selected.has(r.id));
    const html = generateHtml(selectedRaces, layouts, athleteMap);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">PDF Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        <div className="px-4 py-2 border-b flex items-center gap-2">
          <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
          <button onClick={selectNone} className="text-xs text-blue-600 hover:underline">Select None</button>
          <span className="text-xs text-gray-400 ml-auto">{selected.size} of {races.length} selected</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {races.map(race => (
            <label
              key={race.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                selected.has(race.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(race.id)}
                onChange={() => toggleRace(race.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{race.name}</div>
                <div className="text-[10px] text-gray-400">
                  {race.boatType === 'standard' ? 'ST' : 'SM'} · {race.distance}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleGenerate}
            disabled={selected.size === 0}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Open Crew Sheets ({selected.size})
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
