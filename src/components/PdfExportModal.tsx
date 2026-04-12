import { useState } from 'react';
import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onClose: () => void;
}

function CrewSheet({ race, layout, athleteMap }: {
  race: Race;
  layout: BoatLayout;
  athleteMap: Map<number, Athlete>;
}) {
  const getName = (id: number | null) => {
    if (id === null) return '';
    return athleteMap.get(id)?.name ?? '?';
  };
  const getWeight = (id: number | null) => {
    if (id === null) return '';
    const w = athleteMap.get(id)?.weight;
    return w ? `${w}` : '';
  };

  const paddlersFilled = layout.left.filter(Boolean).length + layout.right.filter(Boolean).length;
  const totalPaddlers = race.numRows * 2;

  return (
    <div className="crew-sheet break-after-page p-6">
      <h2 className="text-xl font-bold mb-1">{race.name}</h2>
      <div className="text-sm text-gray-500 mb-4">
        {race.boatType === 'standard' ? 'Standard (20)' : 'Small (10)'} · {race.distance} · {paddlersFilled}/{totalPaddlers} paddlers
      </div>

      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 text-left w-12">Seat</th>
            <th className="border px-2 py-1 text-left">Left</th>
            <th className="border px-2 py-1 text-right w-14">kg</th>
            <th className="border px-2 py-1 text-left">Right</th>
            <th className="border px-2 py-1 text-right w-14">kg</th>
          </tr>
        </thead>
        <tbody>
          {/* Drummer */}
          <tr className="bg-amber-50">
            <td className="border px-2 py-1 text-gray-400 text-xs">DR</td>
            <td className="border px-2 py-1 font-medium" colSpan={2}>{getName(layout.drummer)}</td>
            <td className="border px-2 py-1" colSpan={2}></td>
          </tr>
          {/* Paddlers */}
          {Array.from({ length: race.numRows }).map((_, i) => (
            <tr key={i}>
              <td className="border px-2 py-1 text-gray-400 text-xs">{i + 2}</td>
              <td className="border px-2 py-1 font-medium">{getName(layout.left[i])}</td>
              <td className="border px-2 py-1 text-right text-gray-500">{getWeight(layout.left[i])}</td>
              <td className="border px-2 py-1 font-medium">{getName(layout.right[i])}</td>
              <td className="border px-2 py-1 text-right text-gray-500">{getWeight(layout.right[i])}</td>
            </tr>
          ))}
          {/* Helm */}
          <tr className="bg-amber-50">
            <td className="border px-2 py-1 text-gray-400 text-xs">HM</td>
            <td className="border px-2 py-1" colSpan={2}></td>
            <td className="border px-2 py-1 font-medium" colSpan={2}>{getName(layout.helm)}</td>
          </tr>
        </tbody>
      </table>

      {/* Reserves */}
      {layout.reserves.length > 0 && (
        <div className="text-sm">
          <span className="font-semibold text-gray-600">Reserves: </span>
          {layout.reserves.map((id, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {getName(id)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PdfExportModal({ races, layouts, athleteMap, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(races.map(r => r.id)));
  const [previewing, setPreviewing] = useState(false);

  const toggleRace = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(races.map(r => r.id)));
  const selectNone = () => setSelected(new Set());

  const handlePrint = () => {
    setPreviewing(true);
    setTimeout(() => {
      window.print();
      setPreviewing(false);
    }, 200);
  };

  const selectedRaces = races.filter(r => selected.has(r.id));

  if (previewing) {
    return (
      <div className="print-container">
        <style>{`
          @media screen {
            .print-container { position: fixed; inset: 0; z-index: 9999; background: white; overflow: auto; }
          }
          @media print {
            body > *:not(.print-container) { display: none !important; }
            .print-container { position: static; }
            .no-print { display: none !important; }
            .break-after-page { page-break-after: always; }
            .break-after-page:last-child { page-break-after: auto; }
          }
        `}</style>
        <div className="no-print p-4 border-b flex items-center justify-between">
          <span className="text-sm text-gray-500">Print dialog should open. If not, press Ctrl+P / Cmd+P.</span>
          <button onClick={() => setPreviewing(false)} className="px-3 py-1 text-sm bg-gray-100 rounded-lg">Close Preview</button>
        </div>
        {selectedRaces.map(race => {
          const layout = layouts[race.id];
          return layout ? <CrewSheet key={race.id} race={race} layout={layout} athleteMap={athleteMap} /> : null;
        })}
      </div>
    );
  }

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
            onClick={handlePrint}
            disabled={selected.size === 0}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Print / Save PDF ({selected.size})
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
