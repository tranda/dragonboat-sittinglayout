import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onClose: () => void;
}

function CrewSheetPage({ race, layout, athleteMap }: {
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
    <div style={{ width: '794px', padding: '40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#222', background: 'white' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{race.name}</h2>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
        {race.boatType === 'standard' ? 'Standard (20)' : 'Small (10)'} · {race.distance} · {paddlersFilled}/{totalPaddlers} paddlers
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '5px 10px', background: '#f0f0f0', width: '40px', textAlign: 'center', color: '#555' }}>Seat</th>
            <th style={{ border: '1px solid #ccc', padding: '5px 10px', background: '#f0f0f0', textAlign: 'left', color: '#555' }}>Left</th>
            <th style={{ border: '1px solid #ccc', padding: '5px 10px', background: '#f0f0f0', width: '50px', textAlign: 'right', color: '#555' }}>kg</th>
            <th style={{ border: '1px solid #ccc', padding: '5px 10px', background: '#f0f0f0', textAlign: 'left', color: '#555' }}>Right</th>
            <th style={{ border: '1px solid #ccc', padding: '5px 10px', background: '#f0f0f0', width: '50px', textAlign: 'right', color: '#555' }}>kg</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: '#fff8eb' }}>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px', textAlign: 'center', color: '#999', fontSize: '11px' }}>DR</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px', fontWeight: 500 }} colSpan={2}>{getName(layout.drummer)}</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px' }} colSpan={2}></td>
          </tr>
          {Array.from({ length: race.numRows }).map((_, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ccc', padding: '5px 10px', textAlign: 'center', color: '#999', fontSize: '11px' }}>{i + 2}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 10px', fontWeight: 500 }}>{getName(layout.left[i])}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 10px', textAlign: 'right', color: '#999' }}>{getWeight(layout.left[i])}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 10px', fontWeight: 500 }}>{getName(layout.right[i])}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 10px', textAlign: 'right', color: '#999' }}>{getWeight(layout.right[i])}</td>
            </tr>
          ))}
          <tr style={{ background: '#fff8eb' }}>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px', textAlign: 'center', color: '#999', fontSize: '11px' }}>HM</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px' }} colSpan={2}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px 10px', fontWeight: 500 }} colSpan={2}>{getName(layout.helm)}</td>
          </tr>
        </tbody>
      </table>
      {layout.reserves.length > 0 && (
        <p style={{ marginTop: '10px', fontSize: '13px' }}>
          <b>Reserves: </b>
          {layout.reserves.map(id => getName(id)).filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}

export function PdfExportModal({ races, layouts, athleteMap, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(races.map(r => r.id)));
  const [generating, setGenerating] = useState(false);
  const renderRef = useRef<HTMLDivElement>(null);

  const toggleRace = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(races.map(r => r.id)));
  const selectNone = () => setSelected(new Set());

  const selectedRaces = races.filter(r => selected.has(r.id));

  const handleDownload = async () => {
    if (!renderRef.current || selectedRaces.length === 0) return;
    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pages = renderRef.current.children;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage();
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        const pageWidth = 210;
        const pageHeight = (canvas.height * pageWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, Math.min(pageHeight, 297));
      }

      doc.save('crew-sheets.pdf');
    } catch (err) {
      alert('PDF generation failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setGenerating(false);
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
          <button onClick={selectAll} className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">All</button>
          <button onClick={selectNone} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">None</button>
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
            onClick={handleDownload}
            disabled={selected.size === 0 || generating}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Download PDF (${selected.size})`}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">
            Cancel
          </button>
        </div>
      </div>

      {/* Hidden render area for html2canvas */}
      <div ref={renderRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {selectedRaces.map(race => {
          const layout = layouts[race.id];
          return layout ? <CrewSheetPage key={race.id} race={race} layout={layout} athleteMap={athleteMap} /> : null;
        })}
      </div>
    </div>
  );
}
