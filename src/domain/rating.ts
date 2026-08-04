export function bayesianRating(average: number, count: number, globalMean = 3.5, minimumWeight = 10): number {
  if (count < 0 || average < 1 || average > 5) throw new RangeError("Invalid rating data");
  return (count * average + minimumWeight * globalMean) / (count + minimumWeight);
}
