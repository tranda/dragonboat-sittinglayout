import { useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Race } from '../types';
import * as api from '../utils/api';

interface Props {
  races: Race[];
  onClose: () => void;
  onSaved: (ids: string[]) => void;
}

function SortableRow({ race }: { race: Race }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: race.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 px-3 py-3 bg-white border rounded-lg cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="flex flex-col gap-0.5 text-gray-400">
        <div className="w-4 h-0.5 bg-current rounded" />
        <div className="w-4 h-0.5 bg-current rounded" />
        <div className="w-4 h-0.5 bg-current rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{race.name}</div>
        <div className="text-[10px] text-gray-400">{race.boatType === 'standard' ? 'ST' : 'SM'} · {race.distance}</div>
      </div>
    </div>
  );
}

export function RaceReorderModal({ races, onClose, onSaved }: Props) {
  const [items, setItems] = useState<Race[]>(races);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems(prev => {
      const oldIndex = prev.findIndex(r => r.id === active.id);
      const newIndex = prev.findIndex(r => r.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ids = items.map(r => r.id);
      await api.reorderRaces(ids);
      onSaved(ids);
      onClose();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Reorder Races</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[11px] text-gray-500 mb-2 px-1">Drag to reorder. Save when done.</div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map(race => (
                  <SortableRow key={race.id} race={race} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
