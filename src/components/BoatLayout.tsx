import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Athlete, BoatLayout as BoatLayoutType, Race, AppConfig } from '../types';
import { Seat } from './Seat';
import { AthleteChip } from './AthleteChip';
import { AthletePoolModal } from './AthletePoolModal';
import { calcWeightStats } from '../utils/weightCalc';
import { validateMixedRatio } from '../utils/policies';

interface Props {
  race: Race;
  layout: BoatLayoutType;
  athleteMap: Map<number, Athlete>;
  benchFactors: number[];
  unassignedAthletes: Athlete[];
  showWeights: boolean;
  onLayoutChange: (layout: BoatLayoutType) => void;
  readOnly?: boolean;
  appConfig: AppConfig;
}

function parseSeatId(id: string): { type: string; index?: number } {
  const parts = id.split('-');
  if (parts[0] === 'left' || parts[0] === 'right') return { type: parts[0], index: parseInt(parts[1]) };
  if (parts[0] === 'reserve') return { type: 'reserve', index: parseInt(parts[1]) };
  return { type: parts[0] };
}

function getAthleteFromSeat(layout: BoatLayoutType, seatId: string): number | null {
  const { type, index } = parseSeatId(seatId);
  if (type === 'left') return layout.left[index!];
  if (type === 'right') return layout.right[index!];
  if (type === 'drummer') return layout.drummer;
  if (type === 'helm') return layout.helm;
  if (type === 'reserve') return (index! < layout.reserves.length ? layout.reserves[index!] : null) ?? null;
  return null;
}

function setAthleteInSeat(layout: BoatLayoutType, seatId: string, athleteId: number | null): BoatLayoutType {
  const next = { ...layout, left: [...layout.left], right: [...layout.right], reserves: [...layout.reserves] };
  const { type, index } = parseSeatId(seatId);
  if (type === 'left') next.left[index!] = athleteId;
  else if (type === 'right') next.right[index!] = athleteId;
  else if (type === 'drummer') next.drummer = athleteId;
  else if (type === 'helm') next.helm = athleteId;
  else if (type === 'reserve') {
    // Expand reserves array to fit the index
    while (next.reserves.length <= (index ?? 0)) next.reserves.push(null);
    if (athleteId === null) {
      next.reserves[index!] = null;
    } else {
      next.reserves[index!] = athleteId;
    }
    // Clean trailing nulls
    while (next.reserves.length > 0 && next.reserves[next.reserves.length - 1] == null) next.reserves.pop();
  }
  return next;
}

function UnseatZone({ id, side }: { id: string; side: 'left' | 'right' }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} w-12 h-full z-30 flex items-center justify-center transition-all ${
        isOver ? 'bg-orange-400/40' : 'bg-orange-400/0'
      }`}
    >
      {isOver && (
        <div className="text-white text-[10px] font-bold" style={{ writingMode: 'vertical-rl' }}>
          BENCH
        </div>
      )}
    </div>
  );
}

export function BoatLayout({
  race, layout, athleteMap, benchFactors, unassignedAthletes,
  showWeights, onLayoutChange, readOnly = false, appConfig,
}: Props) {
  const [activeItem, setActiveItem] = useState<{ seatId: string; athleteId: number | null } | null>(null);
  const [poolSeatId, setPoolSeatId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } });
  const sensors = useSensors(...(readOnly ? [] : [mouseSensor, touchSensor]));

  const stats = calcWeightStats(layout, athleteMap, benchFactors);
  const mixedRatio = race.genderCategory === 'Mixed' ? validateMixedRatio(layout, race, athleteMap, appConfig) : null;

  // Balance color
  const lrAbs = Math.abs(stats.leftRightDiff);
  const lrColor = lrAbs < 10 ? 'text-green-600' : lrAbs < 30 ? 'text-yellow-600' : 'text-red-600';
  const tdAbs = Math.abs(stats.topDownDiff);
  const tdColor = tdAbs < 20 ? 'text-green-600' : tdAbs < 50 ? 'text-yellow-600' : 'text-red-600';

  const handleDragStart = (event: DragStartEvent) => {
    const seatId = event.active.id as string;
    const athleteId = seatId.startsWith('bench-')
      ? parseInt(seatId.replace('bench-', ''))
      : getAthleteFromSeat(layout, seatId);
    setActiveItem({ seatId, athleteId });
    setIsDragging(true);
  };

  // Check if adding an athlete to a paddler seat would exceed the gender max
  const isPaddlerSeat = (seatId: string) => {
    const { type } = parseSeatId(seatId);
    return type === 'left' || type === 'right';
  };

  const wouldExceedGenderMax = (athleteId: number, toSeatId: string): boolean => {
    if (!mixedRatio || !isPaddlerSeat(toSeatId)) return false;
    const athlete = athleteMap.get(athleteId);
    if (!athlete) return false;
    const count = athlete.gender === 'F' ? mixedRatio.womenCount : mixedRatio.menCount;
    return count >= mixedRatio.maxSameGender;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromId = active.id as string;
    const toId = over.id as string;

    // Edge zones — unseat athlete back to bench (not remove from team)
    if (toId === 'remove-left' || toId === 'remove-right') {
      const fromIsBench = fromId.startsWith('bench-');
      if (fromIsBench) {
        // Already on bench, do nothing
      } else {
        // Remove from seat back to bench
        onLayoutChange(setAthleteInSeat(layout, fromId, null));
      }
      return;
    }

    const fromIsBench = fromId.startsWith('bench-');
    const toIsBench = toId === 'bench-drop';

    if (fromIsBench && toIsBench) return;

    if (fromIsBench) {
      const athleteId = parseInt(fromId.replace('bench-', ''));
      // Block if gender max would be exceeded on a paddler seat
      if (wouldExceedGenderMax(athleteId, toId)) return;
      onLayoutChange(setAthleteInSeat(layout, toId, athleteId));
    } else if (toIsBench) {
      onLayoutChange(setAthleteInSeat(layout, fromId, null));
    } else {
      // Seat-to-seat swap: check if the incoming athlete to a paddler seat exceeds max
      const fromAthlete = getAthleteFromSeat(layout, fromId);
      const toAthlete = getAthleteFromSeat(layout, toId);
      // For swaps, we need to check net effect — only block if adding a new gender to a paddler seat
      // If swapping two paddler seats, the counts stay the same, so allow
      // If moving from non-paddler to paddler, check the athlete being placed
      if (fromAthlete && isPaddlerSeat(toId) && !isPaddlerSeat(fromId)) {
        if (wouldExceedGenderMax(fromAthlete, toId)) return;
      }
      if (toAthlete && isPaddlerSeat(fromId) && !isPaddlerSeat(toId)) {
        if (wouldExceedGenderMax(toAthlete, fromId)) return;
      }
      let next = setAthleteInSeat(layout, fromId, toAthlete);
      next = setAthleteInSeat(next, toId, fromAthlete);
      onLayoutChange(next);
    }
  };

  const handleSeatTap = (seatId: string) => {
    if (readOnly) return;
    const athlete = getAthleteFromSeat(layout, seatId);
    if (athlete === null) {
      // Empty seat: open pool
      setPoolSeatId(seatId);
    }
    // Occupied seat: could add swap UI later, for now drag handles it
  };

  const handlePoolSelect = (athlete: Athlete) => {
    if (poolSeatId) {
      if (wouldExceedGenderMax(athlete.id, poolSeatId)) return;
      onLayoutChange(setAthleteInSeat(layout, poolSeatId, athlete.id));
      setPoolSeatId(null);
    }
  };

  // Filter pool athletes: hide gender-maxed athletes for paddler seats
  const poolAthletes = poolSeatId && mixedRatio && isPaddlerSeat(poolSeatId)
    ? unassignedAthletes.filter(a => {
        const count = a.gender === 'F' ? mixedRatio.womenCount : mixedRatio.menCount;
        return count < mixedRatio.maxSameGender;
      })
    : unassignedAthletes;

  const activeAthlete = activeItem?.athleteId ? athleteMap.get(activeItem.athleteId) : null;

  const reserveCount = appConfig.reserves
    ? (race.boatType === 'standard' ? appConfig.reserves.standard : appConfig.reserves.small)
    : (race.boatType === 'standard' ? 4 : 2);
  const reservePairs = Math.ceil(reserveCount / 2);
  // Total grid rows: 1 drummer + numRows seats + 1 helm + reservePairs reserves
  const totalRows = 1 + race.numRows + 1 + reservePairs;

  // Ensure layout.reserves has enough slots
  const reserves = [...layout.reserves];
  while (reserves.length < reserveCount) reserves.push(null);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Remove zones on screen edges (visible only while dragging) */}
      {isDragging && (
        <>
          <UnseatZone id="remove-left" side="left" />
          <UnseatZone id="remove-right" side="right" />
        </>
      )}

      {/* Compact balance bar — always visible */}
      <div className="flex items-center justify-between text-[11px] mb-1 px-1 font-semibold">
        <span className="text-[var(--text-primary)]">{stats.totalWeight}kg</span>
        <span className={`${lrColor} font-bold`}>L/R: {stats.leftRightDiff > 0 ? '+' : ''}{stats.leftRightDiff}</span>
        <span className={`${tdColor} font-bold`}>F/R: {stats.topDownDiff > 0 ? '+' : ''}{stats.topDownDiff}</span>
        <span className="text-[var(--text-secondary)]">L:{stats.leftWeight} R:{stats.rightWeight}</span>
      </div>
      {/* Mixed ratio warning */}
      {mixedRatio && (mixedRatio.womenCount > 0 || mixedRatio.menCount > 0) && (() => {
        const exceeded = mixedRatio.womenCount > mixedRatio.maxSameGender || mixedRatio.menCount > mixedRatio.maxSameGender;
        const colorClass = exceeded ? 'bg-red-50 text-red-700' : mixedRatio.valid ? 'bg-green-50 text-green-700' : 'text-[var(--text-secondary)]';
        return (
          <div className={`flex items-center justify-center gap-2 text-[11px] mb-1 px-1 py-0.5 rounded font-semibold ${colorClass}`}>
            <span>W:{mixedRatio.womenCount} M:{mixedRatio.menCount}</span>
            <span className="text-[10px] font-normal">
              (need {mixedRatio.minSameGender}-{mixedRatio.maxSameGender} each)
            </span>
            {exceeded && <span>!</span>}
          </div>
        );
      })()}

      {/* Boat grid — unified, fits viewport */}
      <div
        className="grid gap-x-px gap-y-1.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] overflow-hidden p-1"
        style={{
          gridTemplateColumns: '14px 1fr 18px 1fr 14px',
          gridTemplateRows: `repeat(${totalRows}, 1fr)`,
          height: `calc(100dvh - 180px)`,
        }}
      >
        {/* Drummer row — seat 1 */}
        <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">1</span></div>
        <Seat seatId="drummer" athlete={layout.drummer ? athleteMap.get(layout.drummer) ?? null : null} showWeight={showWeights} onTap={() => handleSeatTap('drummer')} />
        <div className="flex items-center justify-center bg-amber-50/60">
          <span className="text-[7px] text-amber-400">DR</span>
        </div>
        <div className="bg-amber-50/30" />
        <div />

        {/* Seat rows — left: 2..numRows+1, right: numRows+2..numRows*2+1 */}
        {Array.from({ length: race.numRows }).map((_, i) => {
          const leftNum = i + 2;
          const rightNum = race.numRows + i + 2;
          return (
            <div key={i} className="contents">
              <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{leftNum}</span></div>
              <Seat
                seatId={`left-${i}`}
                athlete={layout.left[i] ? athleteMap.get(layout.left[i]!) ?? null : null}
                showWeight={showWeights}
                onTap={() => handleSeatTap(`left-${i}`)}
              />
              <div className="flex items-center justify-center bg-gray-50/80" />
              <Seat
                seatId={`right-${i}`}
                athlete={layout.right[i] ? athleteMap.get(layout.right[i]!) ?? null : null}
                showWeight={showWeights}
                onTap={() => handleSeatTap(`right-${i}`)}
              />
              <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{rightNum}</span></div>
            </div>
          );
        })}

        {/* Helm row */}
        <div />
        <div className="bg-amber-50/30" />
        <div className="flex items-center justify-center bg-amber-50/60">
          <span className="text-[7px] text-amber-400">HM</span>
        </div>
        <Seat seatId="helm" athlete={layout.helm ? athleteMap.get(layout.helm) ?? null : null} showWeight={showWeights} onTap={() => handleSeatTap('helm')} />
        <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{race.numRows * 2 + 2}</span></div>

        {/* Reserve rows */}
        {Array.from({ length: reservePairs }).map((_, pi) => {
          const li = pi * 2;
          const ri = pi * 2 + 1;
          const leftId = reserves[li] ?? null;
          const rightId = ri < reserveCount ? (reserves[ri] ?? null) : undefined;
          const helmNum = race.numRows * 2 + 2;
          const leftResNum = helmNum + pi + 1;
          const rightResNum = helmNum + reservePairs + pi + 1;
          return (
            <div key={`res-${pi}`} className="contents">
              <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{leftResNum}</span></div>
              <Seat
                seatId={`reserve-${li}`}
                athlete={leftId ? athleteMap.get(leftId) ?? null : null}
                showWeight={showWeights}
                onTap={() => handleSeatTap(`reserve-${li}`)}
              />
              <div className="flex items-center justify-center bg-green-50/60">
                <span className="text-[7px] text-green-400">R</span>
              </div>
              {rightId !== undefined ? (
                <Seat
                  seatId={`reserve-${ri}`}
                  athlete={rightId ? athleteMap.get(rightId) ?? null : null}
                  showWeight={showWeights}
                  onTap={() => handleSeatTap(`reserve-${ri}`)}
                />
              ) : (
                <div className="bg-green-50/20" />
              )}
              {rightId !== undefined ? (
                <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{rightResNum}</span></div>
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>

      {/* Bench (scrollable horizontal) */}
      <div className="mt-1">
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-0.5 px-1">
          <span>Bench ({unassignedAthletes.length})</span>
          <Seat seatId="bench-drop" athlete={null} isDropZone />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 px-1 scrollbar-hide" onWheel={e => { if (e.deltaY !== 0) { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; } }}>
          {unassignedAthletes.map(a => (
            <AthleteChip key={a.id} athlete={a} seatId={`bench-${a.id}`} showWeight={showWeights} />
          ))}
          {unassignedAthletes.length === 0 && (
            <span className="text-[10px] text-[var(--text-muted)] py-1">No athletes on bench</span>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeAthlete ? (
          <div className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded shadow-xl font-medium opacity-90 whitespace-nowrap">
            {activeAthlete.name}
          </div>
        ) : null}
      </DragOverlay>

      {/* Athlete pool modal */}
      {poolSeatId && (
        <AthletePoolModal
          athletes={poolAthletes}
          onSelect={handlePoolSelect}
          onClose={() => setPoolSeatId(null)}
        />
      )}
    </DndContext>
  );
}
