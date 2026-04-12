import { useDraggable } from '@dnd-kit/core';
import type { Athlete } from '../types';

interface Props {
  athlete: Athlete;
  seatId: string;
  showWeight?: boolean;
}

export function AthleteChip({ athlete, seatId, showWeight }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: seatId });

  const genderColor = athlete.gender === 'F'
    ? 'bg-[var(--bg-female)] border-[var(--border-female)] text-[var(--text-female)]'
    : 'bg-[var(--bg-male)] border-[var(--border-male)] text-[var(--text-male)]';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex-shrink-0 px-2 py-0.5 rounded border text-[10px] whitespace-nowrap ${
        isDragging ? 'opacity-30' : ''
      } ${genderColor}`}
    >
      {athlete.name}
      {athlete.preferredSide && <span className="ml-1 px-1 bg-[var(--bg-badge-side)] text-[var(--text-badge-side)] rounded text-[8px] font-semibold">{athlete.preferredSide === 'both' ? 'L/R' : athlete.preferredSide === 'left' ? 'L' : 'R'}</span>}
      {athlete.isBCP && <span className="ml-1 px-1 bg-[var(--bg-badge-bcp)] text-[var(--text-badge-bcp)] rounded text-[8px] font-semibold">BCP</span>}
      {showWeight && <span className="opacity-50 ml-0.5">{athlete.weight || '?'}</span>}
    </div>
  );
}
