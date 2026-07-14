import { useState, useEffect } from 'react';
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
import { MEDAL_EMOJI } from '../types';
import { Seat } from './Seat';
import { AthleteChip } from './AthleteChip';
import { AthletePoolModal } from './AthletePoolModal';
import { calcWeightStats } from '../utils/weightCalc';
import { validateMixedRatio, isEligibleForAgeCategory } from '../utils/policies';
import { setDragging } from '../utils/sync';

interface Props {
  race: Race;
  layout: BoatLayoutType;
  athleteMap: Map<number, Athlete>;
  benchFactors: number[];
  unassignedAthletes: Athlete[];
  unassignedAthletesAnyAge: Athlete[];
  showWeights: boolean;
  onLayoutChange: (layout: BoatLayoutType) => void;
  readOnly?: boolean;
  appConfig: AppConfig;
  athleteConflicts?: Map<number, import('../utils/conflicts').ConflictGroup[]>;
  onShowConflict?: (athleteId: number) => void;
  onShowSchedule?: () => void;
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
  race, layout, athleteMap, benchFactors, unassignedAthletes, unassignedAthletesAnyAge,
  showWeights, onLayoutChange, readOnly = false, appConfig,
  athleteConflicts, onShowConflict, onShowSchedule,
}: Props) {
  const conflictedInThisRace = (() => {
    const set = new Set<number>();
    if (!athleteConflicts) return set;
    for (const [athleteId, groups] of athleteConflicts) {
      if (groups.some(g => g.races.some(r => r.id === race.id))) {
        set.add(athleteId);
      }
    }
    return set;
  })();
  const seatHasConflict = (athleteId: number | null | undefined) =>
    athleteId != null && conflictedInThisRace.has(athleteId);
  const [activeItem, setActiveItem] = useState<{ seatId: string; athleteId: number | null } | null>(null);
  const [poolSeatId, setPoolSeatId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } });
  const sensors = useSensors(...(readOnly ? [] : [mouseSensor, touchSensor]));

  useEffect(() => {
    if (!isDragging) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, [isDragging]);

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
    setDragging(true); // defer background realtime refresh while dragging
  };

  // Check if adding an athlete to a paddler seat would exceed the gender max
  const isPaddlerSeat = (seatId: string) => {
    const { type } = parseSeatId(seatId);
    return type === 'left' || type === 'right';
  };

  const isAgeIneligibleForPaddler = (athleteId: number, toSeatId: string): boolean => {
    if (!isPaddlerSeat(toSeatId)) return false;
    const athlete = athleteMap.get(athleteId);
    if (!athlete) return false;
    return !isEligibleForAgeCategory(athlete, race.ageCategory, appConfig);
  };

  const wouldExceedGenderMax = (athleteId: number, toSeatId: string): boolean => {
    if (!mixedRatio || !isPaddlerSeat(toSeatId)) return false;
    const athlete = athleteMap.get(athleteId);
    if (!athlete) return false;
    const count = athlete.gender === 'F' ? mixedRatio.womenCount : mixedRatio.menCount;
    // If replacing an athlete of the same gender on the target seat, net count is unchanged
    const existingId = getAthleteFromSeat(layout, toSeatId);
    if (existingId != null) {
      const existing = athleteMap.get(existingId);
      if (existing && existing.gender === athlete.gender) return false;
    }
    return count >= mixedRatio.maxSameGender;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    setIsDragging(false);
    setDragging(false);
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
      if (isAgeIneligibleForPaddler(athleteId, toId)) return;
      onLayoutChange(setAthleteInSeat(layout, toId, athleteId));
    } else if (toIsBench) {
      onLayoutChange(setAthleteInSeat(layout, fromId, null));
    } else {
      // Seat-to-seat swap: check if the incoming athlete to a paddler seat exceeds max or is age-ineligible
      const fromAthlete = getAthleteFromSeat(layout, fromId);
      const toAthlete = getAthleteFromSeat(layout, toId);
      if (fromAthlete && isPaddlerSeat(toId) && !isPaddlerSeat(fromId)) {
        if (wouldExceedGenderMax(fromAthlete, toId)) return;
        if (isAgeIneligibleForPaddler(fromAthlete, toId)) return;
      }
      if (toAthlete && isPaddlerSeat(fromId) && !isPaddlerSeat(toId)) {
        if (wouldExceedGenderMax(toAthlete, fromId)) return;
        if (isAgeIneligibleForPaddler(toAthlete, fromId)) return;
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
      if (isAgeIneligibleForPaddler(athlete.id, poolSeatId)) return;
      onLayoutChange(setAthleteInSeat(layout, poolSeatId, athlete.id));
      setPoolSeatId(null);
    }
  };

  // Filter pool athletes: drummer/helm have no age restriction; paddlers respect age + gender max
  const poolAthletes = (() => {
    if (!poolSeatId) return unassignedAthletes;
    const { type } = parseSeatId(poolSeatId);
    if (type === 'drummer' || type === 'helm') return unassignedAthletesAnyAge;
    if (mixedRatio && isPaddlerSeat(poolSeatId)) {
      return unassignedAthletes.filter(a => {
        const count = a.gender === 'F' ? mixedRatio.womenCount : mixedRatio.menCount;
        return count < mixedRatio.maxSameGender;
      });
    }
    return unassignedAthletes;
  })();

  const activeAthlete = activeItem?.athleteId ? athleteMap.get(activeItem.athleteId) : null;

  const reserveCount = appConfig.reserves
    ? (race.boatType === 'standard' ? appConfig.reserves.standard : appConfig.reserves.small)
    : (race.boatType === 'standard' ? 4 : 2);
  const reservePairs = Math.ceil(reserveCount / 2);

  // Ensure layout.reserves has enough slots
  const reserves = [...layout.reserves];
  while (reserves.length < reserveCount) reserves.push(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveItem(null); setIsDragging(false); setDragging(false); }}
    >
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
              (min {mixedRatio.minSameGender}, max {mixedRatio.maxSameGender} each)
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
          gridTemplateRows: `repeat(${1 + race.numRows + 1 + reservePairs}, 1fr)`,
          height: `calc(100dvh - 180px)`,
        }}
      >
        {/* Drummer row — seat 1, centered */}
        <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">1</span></div>
        <div className="col-span-3 grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
          <div className="flex items-center justify-start pl-1">
            {race.medal && <span className="text-xl leading-none" title={`${race.medal} medal`}>{MEDAL_EMOJI[race.medal]}</span>}
          </div>
          <Seat seatId="drummer" athlete={layout.drummer ? athleteMap.get(layout.drummer) ?? null : null} showWeight={showWeights} onTap={() => handleSeatTap('drummer')} hasConflict={seatHasConflict(layout.drummer)} onConflictTap={() => layout.drummer != null && onShowConflict?.(layout.drummer)} />
          <div className="flex items-center justify-between pl-1">
            <span className="text-[7px] text-amber-400">DR</span>
            <button
              onClick={onShowSchedule}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] relative"
              title="Race times"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
              {(race.schedule?.length ?? 0) > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--text-badge-side)]" />
              )}
            </button>
          </div>
        </div>
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
                hasConflict={seatHasConflict(layout.left[i])}
                onConflictTap={() => layout.left[i] != null && onShowConflict?.(layout.left[i]!)}
              />
              <div className="flex items-center justify-center bg-gray-50/80" />
              <Seat
                seatId={`right-${i}`}
                athlete={layout.right[i] ? athleteMap.get(layout.right[i]!) ?? null : null}
                showWeight={showWeights}
                onTap={() => handleSeatTap(`right-${i}`)}
                hasConflict={seatHasConflict(layout.right[i])}
                onConflictTap={() => layout.right[i] != null && onShowConflict?.(layout.right[i]!)}
              />
              <div className="flex items-center justify-center"><span className="text-[8px] text-[var(--text-secondary)] font-mono font-bold">{rightNum}</span></div>
            </div>
          );
        })}

        {/* Helm row — centered */}
        <div className="flex items-center justify-center"><span className="text-[7px] text-amber-400">HM</span></div>
        <div className="col-span-3 grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
          <div /><Seat seatId="helm" athlete={layout.helm ? athleteMap.get(layout.helm) ?? null : null} showWeight={showWeights} onTap={() => handleSeatTap('helm')} hasConflict={seatHasConflict(layout.helm)} onConflictTap={() => layout.helm != null && onShowConflict?.(layout.helm)} /><div />
        </div>
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
                hasConflict={seatHasConflict(leftId)}
                onConflictTap={() => leftId != null && onShowConflict?.(leftId)}
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
                  hasConflict={seatHasConflict(rightId)}
                  onConflictTap={() => rightId != null && onShowConflict?.(rightId)}
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
          appConfig={appConfig}
        />
      )}
    </DndContext>
  );
}
