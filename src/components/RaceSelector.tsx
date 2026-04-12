import { useEffect, useRef, useCallback } from 'react';
import type { Race } from '../types';

interface Props {
  races: Race[];
  selectedRaceId: string;
  onSelect: (id: string) => void;
}

export function RaceSelector({ races, selectedRaceId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedRaceId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (containerRef.current && e.deltaY !== 0) {
      e.preventDefault();
      containerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <div ref={containerRef} onWheel={handleWheel} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {races.map(race => (
        <button
          key={race.id}
          ref={race.id === selectedRaceId ? selectedRef : undefined}
          onClick={() => onSelect(race.id)}
          className={`flex-shrink-0 px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition-colors ${
            selectedRaceId === race.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)]'
          }`}
        >
          {race.name}
          <span className={`ml-0.5 text-[9px] ${selectedRaceId === race.id ? 'text-blue-200' : 'text-[var(--text-muted)]'}`}>
            {race.boatType === 'standard' ? '20' : '10'}
          </span>
        </button>
      ))}
    </div>
  );
}
