import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onClose: () => void;
}

function generatePdf(races: Race[], layouts: Record<string, BoatLayout>, athleteMap: Map<number, Athlete>) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const getName = (id: number | null) => {
    if (id === null) return '';
    return athleteMap.get(id)?.name ?? '?';
  };
  const getWeight = (id: number | null) => {
    if (id === null) return '';
    const w = athleteMap.get(id)?.weight;
    return w ? `${w}` : '';
  };

  races.forEach((race, raceIdx) => {
    if (raceIdx > 0) doc.addPage();
    const layout = layouts[race.id];
    if (!layout) return;

    const paddlersFilled = layout.left.filter(Boolean).length + layout.right.filter(Boolean).length;
    const totalPaddlers = race.numRows * 2;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(race.name, 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `${race.boatType === 'standard' ? 'Standard (20)' : 'Small (10)'}  ·  ${race.distance}  ·  ${paddlersFilled}/${totalPaddlers} paddlers`,
      14, 27
    );
    doc.setTextColor(0);

    // Build table data
    const rows: (string | number)[][] = [];

    // Drummer
    rows.push(['DR', getName(layout.drummer), '', '', '']);

    // Paddlers
    for (let i = 0; i < race.numRows; i++) {
      rows.push([
        String(i + 2),
        getName(layout.left[i]),
        getWeight(layout.left[i]),
        getName(layout.right[i]),
        getWeight(layout.right[i]),
      ]);
    }

    // Helm
    rows.push(['HM', '', '', getName(layout.helm), '']);

    autoTable(doc, {
      startY: 32,
      head: [['Seat', 'Left', 'kg', 'Right', 'kg']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [230, 230, 230], textColor: [50, 50, 50], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: [150, 150, 150] },
        2: { cellWidth: 14, halign: 'right', textColor: [150, 150, 150] },
        4: { cellWidth: 14, halign: 'right', textColor: [150, 150, 150] },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const raw = data.row.raw as string[] | undefined;
          if (raw && (raw[0] === 'DR' || raw[0] === 'HM')) {
            data.cell.styles.fillColor = [255, 248, 235];
          }
        }
      },
    });

    // Reserves
    if (layout.reserves.length > 0) {
      const finalY = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY) ?? 200;
      const reserveNames = layout.reserves.map(id => getName(id)).filter(Boolean).join(', ');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Reserves: ', 14, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(reserveNames, 14 + doc.getTextWidth('Reserves: '), finalY + 8);
    }
  });

  // Open in new tab
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function PdfExportModal({ races, layouts, athleteMap, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(races.map(r => r.id)));
  const [generating, setGenerating] = useState(false);

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
    setGenerating(true);
    const selectedRaces = races.filter(r => selected.has(r.id));
    setTimeout(() => {
      generatePdf(selectedRaces, layouts, athleteMap);
      setGenerating(false);
    }, 50);
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
            disabled={selected.size === 0 || generating}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Generate PDF (${selected.size})`}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
