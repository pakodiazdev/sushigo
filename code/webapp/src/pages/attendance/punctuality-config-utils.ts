export function rangeLabel(minSeconds: number, maxSeconds: number | null): string {
  const minMin = Math.floor(minSeconds / 60)
  if (maxSeconds === null) return `≥ ${minMin} min`
  const maxMin = Math.floor((maxSeconds + 1) / 60)
  return `${minMin} – ${maxMin - 1} min`
}
