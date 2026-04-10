import type { Race } from '../types';

interface Props {
  races: Race[];
  selectedRaceId: string;
  onSelect: (id: string) => void;
}

export function RaceSelector({ races, selectedRaceId, onSelect }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {races.map(race => (
        <button
          key={race.id}
          onClick={() => onSelect(race.id)}
          className={`flex-shrink-0 px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap font-medium transition-colors ${
            selectedRaceId === race.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {race.name}
          <span className={`ml-0.5 text-[9px] ${selectedRaceId === race.id ? 'text-blue-200' : 'text-gray-400'}`}>
            {race.boatType === 'standard' ? '20' : '10'}
          </span>
        </button>
      ))}
    </div>
  );
}
