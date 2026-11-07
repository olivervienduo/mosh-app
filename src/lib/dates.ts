// Date helpers in Austrian German. Event dates are stored as plain dates (YYYY-MM-DD).
const WD = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
const MO = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
export const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export type DatedEvent = { starts_on: string; ends_on?: string | null; start_time?: string | null };

export const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pad = (n: number) => String(n).padStart(2, '0');
const short = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
export const multi = (e: DatedEvent) => !!e.ends_on && e.ends_on > e.starts_on;
export const endOf = (e: DatedEvent) => parseDay(multi(e) ? e.ends_on! : e.starts_on);
export const days = (e: DatedEvent) => Math.round((endOf(e).getTime() - parseDay(e.starts_on).getTime()) / 864e5) + 1;
export const time = (t?: string | null) => (t ? t.slice(0, 5) : '');

export const range = (e: DatedEvent) => multi(e) ? `${short(parseDay(e.starts_on))} – ${short(endOf(e))}` : short(parseDay(e.starts_on));
export const shortDate = (e: DatedEvent) => short(parseDay(e.starts_on));

export function longDate(e: DatedEvent) {
  const d = parseDay(e.starts_on), z = endOf(e);
  const day = (x: Date) => `${WD[x.getDay()]}, ${x.getDate()}. ${MO[x.getMonth()]}`;
  const t = e.start_time ? ` · ${multi(e) ? 'AB ' : ''}${time(e.start_time)}` : '';
  if (!multi(e)) return `${day(d)} ${d.getFullYear()}${t}`;
  return `${day(d)}${d.getFullYear() !== z.getFullYear() ? ' ' + d.getFullYear() : ''} – ${day(z)} ${z.getFullYear()}${t}`;
}

export function until(e: DatedEvent): string {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((parseDay(e.starts_on).getTime() - t.getTime()) / 864e5);
  const m = Math.round((endOf(e).getTime() - t.getTime()) / 864e5);
  if (m < 0) return 'Vorbei';
  if (n < 0) return 'Läuft gerade';
  if (n === 0) return 'Heute';
  if (n === 1) return 'Morgen';
  return `In ${n} Tagen`;
}
export const isPast = (e: DatedEvent) => until(e) === 'Vorbei';
export const isLive = (e: DatedEvent) => { const u = until(e); return u === 'Heute' || u === 'Läuft gerade'; };

export const monthKey = (e: DatedEvent) => { const d = parseDay(e.starts_on); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export function eventDays(e: DatedEvent): string[] {
  return Array.from({ length: days(e) }, (_, i) => {
    const x = parseDay(e.starts_on); x.setDate(x.getDate() + i);
    const w = WD[x.getDay()];
    return `${w[0]}${w.slice(1).toLowerCase()} ${x.getDate()}.${x.getMonth() + 1}.`;
  });
}

export function ago(ts: string | number | Date) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 6e4);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24); if (d === 1) return 'gestern';
  return `vor ${d} Tagen`;
}

export const fmtN = (n: number) => Number(n).toLocaleString('de-DE');

/** Accepts "13.11.2026" or "2026-11-13"; returns ISO or null. */
export function parseInputDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? isoDay(d) : null; }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? t : null;
}
export const toInputDate = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');
export const parseInputTime = (s: string) => { const m = s.trim().match(/^(\d{1,2})[:.](\d{2})$/); return m && +m[1] < 24 && +m[2] < 60 ? `${pad(+m[1])}:${m[2]}` : null; };
export const ageFrom = (iso: string) => { const b = parseDay(iso), t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
