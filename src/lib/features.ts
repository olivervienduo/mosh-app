/**
 * Feature switches. Everything that is `false` here is hidden in the app,
 * but the code, screens and database stay in place.
 *
 * To bring a feature back, set it to `true`. See docs/SPAETER.md.
 * The complete version with everything switched on is saved on the
 * Git branch `voll-version`.
 */
export const FEATURES = {
  /** Organiser feed: posts, photos/videos, polls, reactions, comments. */
  feed: false,
  /** QR check-in at the entrance, "gerade hier", "Jetzt treffen", live filter. */
  checkin: false,
  /** "Offiziell ✓" badge for events and verification in the admin area. */
  official: false,
  /** Statistics for organisers. */
  stats: false,
} as const;

export type Feature = keyof typeof FEATURES;
