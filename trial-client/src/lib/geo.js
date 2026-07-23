// Geo helpers for GPS run tracking. Pure functions, no dependencies.

const R = 6371000; // Earth radius, metres
const toRad = (d) => (d * Math.PI) / 180;

// Haversine distance between two {lat,lng} points, in metres.
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Total path distance in metres. Ignores GPS jitter jumps under a few metres.
export function pathDistance(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const step = haversine(path[i - 1], path[i]);
    if (step >= 1) total += step; // drop sub-metre jitter
  }
  return total;
}

export const KM = 1000;
export const MILE = 1609.344;

export function distanceValue(metres, unit) {
  return metres / (unit === "mi" ? MILE : KM);
}

// Pace: seconds per km (or per mile). 0 when not enough data.
export function paceSecPerUnit(metres, seconds, unit) {
  if (metres <= 0) return 0;
  const units = metres / (unit === "mi" ? MILE : KM);
  return units > 0 ? seconds / units : 0;
}

// Format pace seconds as m'ss" (e.g. 5'42").
export function formatPace(secPerUnit) {
  if (!secPerUnit || !isFinite(secPerUnit) || secPerUnit <= 0) return "—";
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

// Rough running calorie estimate. MET ~ scales with speed; simple + honest.
export function runCalories(metres, seconds, weightKg = 70) {
  if (metres <= 0 || seconds <= 0) return 0;
  const speedMs = metres / seconds;
  // MET model for running: ~1.0 MET per 0.7 m/s, floored at a brisk walk.
  const met = Math.max(3, Math.min(16, speedMs / 0.7));
  const hours = seconds / 3600;
  return Math.round(met * weightKg * hours);
}

// Per-km (or per-mile) splits with their pace, from a timestamped path.
// path entries: {lat,lng,t} where t = ms since run start.
export function computeSplits(path, unit) {
  const unitM = unit === "mi" ? MILE : KM;
  const splits = [];
  let acc = 0;
  let splitStartT = path.length ? path[0].t : 0;
  let idx = 1;
  for (let i = 1; i < path.length; i++) {
    const step = haversine(path[i - 1], path[i]);
    if (step < 1) continue;
    acc += step;
    while (acc >= unitM) {
      const t = path[i].t;
      const dur = (t - splitStartT) / 1000;
      splits.push({ index: idx++, seconds: dur, pace: dur });
      acc -= unitM;
      splitStartT = t;
    }
  }
  // trailing partial split
  if (acc > unitM * 0.15 && path.length) {
    const t = path[path.length - 1].t;
    const dur = (t - splitStartT) / 1000;
    const frac = acc / unitM;
    splits.push({ index: idx, seconds: dur, pace: frac > 0 ? dur / frac : 0, partial: true });
  }
  return splits;
}

// Project a lat/lng path into 0..1 normalized SVG coordinates (y flipped).
export function normalizePath(path, pad = 0.08) {
  if (!path.length) return [];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of path) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  // keep aspect ratio using the larger span so the route isn't stretched
  const span = Math.max(latSpan, lngSpan);
  const latOff = (span - latSpan) / 2;
  const lngOff = (span - lngSpan) / 2;
  const scale = 1 - pad * 2;
  return path.map((p) => ({
    x: pad + (((p.lng - minLng + lngOff) / span) * scale),
    y: pad + ((1 - (p.lat - minLat + latOff) / span) * scale),
  }));
}
