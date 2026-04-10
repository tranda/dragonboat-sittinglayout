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
    ? 'bg-pink-50 border-pink-200 text-pink-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';

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
      {showWeight && <span className="opacity-50 ml-0.5">{athlete.weight || '?'}</span>}
    </div>
  );
}
