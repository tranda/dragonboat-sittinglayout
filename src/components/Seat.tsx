import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { Athlete } from '../types';

interface Props {
  seatId: string;
  athlete: Athlete | null;
  showWeight?: boolean;
  onTap?: () => void;
  isDropZone?: boolean;
}

export function Seat({ seatId, athlete, showWeight, onTap, isDropZone }: Props) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: seatId });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: seatId,
    disabled: !athlete,
  });

  if (isDropZone) {
    return (
      <div
        ref={setDropRef}
        className={`w-full h-6 rounded border-2 border-dashed transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-transparent'
        }`}
      />
    );
  }

  const genderBg = athlete?.gender === 'F'
    ? 'bg-pink-50 border-pink-300'
    : athlete?.gender === 'M'
    ? 'bg-blue-50 border-blue-300'
    : 'bg-gray-50 border-gray-200';

  const emptyStyle = 'bg-gray-100/50 border-gray-200 border-dashed';

  return (
    <div
      ref={(node) => { setDropRef(node); setDragRef(node); }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
      className={`rounded border flex items-center justify-center overflow-hidden transition-all px-1 ${
        isDragging ? 'opacity-20' : ''
      } ${isOver ? 'ring-2 ring-blue-400' : ''} ${athlete ? genderBg : emptyStyle}`}
    >
      {athlete ? (
        <span className="text-[13px] font-medium leading-tight text-center line-clamp-2 break-words">
          {athlete.name}
          {showWeight && athlete.weight ? <span className="text-gray-400 font-normal text-[10px] ml-0.5">{athlete.weight}</span> : null}
        </span>
      ) : (
        <span className="text-[11px] text-gray-300">+</span>
      )}
    </div>
  );
}
