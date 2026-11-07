import { C } from './theme';

export type Mode = 'friends' | 'date' | 'business';
export const MODE_KEYS: Mode[] = ['friends', 'date', 'business'];
export const MODES: Record<Mode, { label: string; color: string; yes: string; verb: string; desc: string; ph: string }> = {
  friends: { label: 'Freunde', color: C.friends, yes: 'Klingt nett', verb: 'als Freunde kennenlernen', desc: 'Leute für Konzerte, Festivals und danach', ph: 'z. B. Suche Leute für die erste Reihe' },
  date: { label: 'Date', color: C.date, yes: 'Gefällt mir', verb: 'daten', desc: 'Romantisch kennenlernen', ph: 'z. B. Erstes Date auf einem Konzert?' },
  business: { label: 'Business', color: C.business, yes: 'Vernetzen', verb: 'beruflich vernetzen', desc: 'Kontakte, Jobs und Kooperationen', ph: 'z. B. Suche Partner für mein Startup' },
};

export type Gender = 'w' | 'm' | 'nb';
export const GENDER: Record<Gender, string> = { w: 'Frau', m: 'Mann', nb: 'Nicht-binär' };
export const SEEK: Record<Gender, string> = { w: 'Frauen', m: 'Männer', nb: 'Nicht-binäre Menschen' };

export type Category = 'festival' | 'konzert' | 'party' | 'kabarett' | 'kultur' | 'ball' | 'messe' | 'konferenz' | 'markt' | 'sport' | 'sonstiges';
export const CATEGORIES: { key: Category; label: string; short?: string; color: string }[] = [
  { key: 'festival', label: 'Festival', color: '#3ED08B' },
  { key: 'konzert', label: 'Konzert', color: '#B9A0F2' },
  { key: 'party', label: 'Party', color: '#FF7A9C' },
  { key: 'kabarett', label: 'Kabarett & Theater', short: 'Kabarett', color: '#F3D65B' },
  { key: 'kultur', label: 'Kultur', color: '#B5C99A' },
  { key: 'ball', label: 'Ball', color: '#E0A3F0' },
  { key: 'messe', label: 'Messe', color: '#F2A65E' },
  { key: 'konferenz', label: 'Konferenz', color: '#6F96F0' },
  { key: 'markt', label: 'Markt', color: '#FFBE4D' },
  { key: 'sport', label: 'Sport', color: '#62CFCB' },
  { key: 'sonstiges', label: 'Sonstiges', color: '#D8CDBB' },
];
export const cat = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1];

export const PALETTE: [string, string][] = [
  ['#3ED08B', 'Mint'], ['#A8E05F', 'Limette'], ['#B5C99A', 'Salbei'], ['#2FB5A0', 'Petrol'], ['#62CFCB', 'Türkis'], ['#8DB8EA', 'Himmelblau'],
  ['#6F96F0', 'Royalblau'], ['#B9A0F2', 'Flieder'], ['#9F7FEA', 'Violett'], ['#E0A3F0', 'Orchidee'], ['#F59DB3', 'Rosa'], ['#FF7A9C', 'Pink'],
  ['#F2705F', 'Koralle'], ['#F2A65E', 'Orange'], ['#FFBE4D', 'Mango'], ['#F3D65B', 'Gelb'], ['#D8CDBB', 'Sand'], ['#C8C3BA', 'Beton'],
];
export const AVATAR_COLORS = ['#3ED08B', '#B9A0F2', '#F2A65E', '#62CFCB', '#F59DB3', '#8DB8EA', '#F3D65B'];

export type ReactionKind = 'like' | 'love' | 'haha' | 'wow' | 'fire';
export const REACTIONS: Record<ReactionKind, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'Gefällt mir' },
  love: { emoji: '❤️', label: 'Liebe ich' },
  haha: { emoji: '😂', label: 'Haha' },
  wow: { emoji: '😮', label: 'Wow' },
  fire: { emoji: '🔥', label: 'Feuer' },
};

export const REPORT_REASONS = ['Unangemessene Nachrichten', 'Fake-Profil', 'Belästigung', 'Minderjährig', 'Spam oder Werbung', 'Etwas anderes'];

export const meetWhen = (live: boolean) => (live ? ['Jetzt', 'In 15 Min.', 'In der Pause', 'Danach'] : ['Vorher', 'Beim Einlass', 'In der Pause', 'Danach']);
export const meetWhere = (category: string) =>
  category === 'messe' || category === 'konferenz' ? ['Eingang', 'Infostand', 'Café', 'Lounge']
    : category === 'sport' ? ['Eingang', 'Imbiss', 'Fanshop', 'Sektor B']
    : ['Eingang', 'Bar', 'Merch-Stand', 'Vor der Bühne'];

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@example.com';
export const LEGAL_URLS = {
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  terms: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
};
