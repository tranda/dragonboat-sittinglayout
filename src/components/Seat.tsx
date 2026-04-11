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
    ? 'bg-pink-100 border-pink-400 shadow-sm'
    : athlete?.gender === 'M'
    ? 'bg-blue-100 border-blue-400 shadow-sm'
    : 'bg-gray-100 border-gray-300 shadow-sm';

  const emptyStyle = 'bg-gray-50 border-gray-400 border-dashed';

  return (
    <div
      ref={(node) => { setDropRef(node); setDragRef(node); }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
      className={`rounded-lg border flex items-center justify-center overflow-hidden transition-all px-1 ${
        isDragging ? 'opacity-20' : ''
      } ${isOver ? 'ring-2 ring-blue-400' : ''} ${athlete ? genderBg : emptyStyle}`}
    >
      {athlete ? (
        <span className="text-[13px] font-bold leading-tight text-center line-clamp-2 break-words text-gray-800">
          {athlete.name}
          {showWeight && athlete.weight ? <span className="text-gray-500 font-normal text-[10px] ml-0.5">{athlete.weight}</span> : null}
        </span>
      ) : (
        <span className="text-[20px] text-gray-400 font-light leading-none">+</span>
      )}
    </div>
  );
}
