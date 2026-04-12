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
          isOver ? 'border-[var(--border-male-strong)] bg-[var(--bg-male)]' : 'border-transparent'
        }`}
      />
    );
  }

  const genderBg = athlete?.gender === 'F'
    ? 'bg-[var(--bg-female-strong)] border-[var(--border-female-strong)] shadow-sm'
    : athlete?.gender === 'M'
    ? 'bg-[var(--bg-male-strong)] border-[var(--border-male-strong)] shadow-sm'
    : 'bg-[var(--bg-surface-alt)] border-[var(--border-default)] shadow-sm';

  const emptyStyle = 'bg-[var(--bg-surface-alt)] border-[var(--border-default)] border-dashed';

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
        <span className="text-[13px] font-bold leading-tight text-center line-clamp-2 break-words text-[var(--text-primary)]">
          {athlete.name}
          {showWeight && athlete.weight ? <span className="text-[var(--text-secondary)] font-normal text-[10px] ml-0.5">{athlete.weight}</span> : null}
        </span>
      ) : (
        <span className="text-[20px] text-[var(--text-muted)] font-light leading-none">+</span>
      )}
    </div>
  );
}
