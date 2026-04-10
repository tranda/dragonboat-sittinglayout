import type { Athlete, BoatLayout } from '../types';

export interface WeightStats {
  totalWeight: number;
  leftWeight: number;
  rightWeight: number;
  leftWeighted: number;
  rightWeighted: number;
  leftRightDiff: number;
  topWeight: number;
  bottomWeight: number;
  topDownDiff: number;
}

export function calcWeightStats(
  layout: BoatLayout,
  athleteMap: Map<number, Athlete>,
  benchFactors: number[]
): WeightStats {
  const getWeight = (id: number | null) =>
    id !== null ? (athleteMap.get(id)?.weight ?? 0) : 0;

  let leftWeight = 0;
  let rightWeight = 0;
  let leftWeighted = 0;
  let rightWeighted = 0;
  let topWeight = 0;
  let bottomWeight = 0;

  const numRows = layout.left.length;
  const midpoint = numRows / 2;

  for (let i = 0; i < numRows; i++) {
    const lw = getWeight(layout.left[i]);
    const rw = getWeight(layout.right[i]);
    const factor = benchFactors[i] ?? 1;

    leftWeight += lw;
    rightWeight += rw;
    leftWeighted += lw * factor;
    rightWeighted += rw * factor;

    if (i < midpoint) {
      topWeight += lw + rw;
    } else {
      bottomWeight += lw + rw;
    }
  }

  const drummerWeight = getWeight(layout.drummer);
  const helmWeight = getWeight(layout.helm);
  topWeight += drummerWeight;
  bottomWeight += helmWeight;

  const totalWeight = leftWeight + rightWeight + drummerWeight + helmWeight;

  return {
    totalWeight,
    leftWeight,
    rightWeight,
    leftWeighted: Math.round(leftWeighted * 100) / 100,
    rightWeighted: Math.round(rightWeighted * 100) / 100,
    leftRightDiff: Math.round((leftWeighted - rightWeighted) * 100) / 100,
    topWeight,
    bottomWeight,
    topDownDiff: topWeight - bottomWeight,
  };
}
