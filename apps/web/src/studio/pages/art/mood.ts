import type { Occurrence } from '../variant';

// The family of compositions a brand leans towards, read from its tone axes: the same page type is drawn
// differently for a playful bakery, a sober institution and an avant-garde studio, so guidelines never
// look like one template. Pure, so the choice is testable and stable.
export const MOODS = ['warm', 'strict', 'editorial'] as const;
export type Mood = (typeof MOODS)[number];

const AXIS_HIGH = 60;
const AXIS_LOW = 35;

export function moodOf(axes: readonly { readonly id: string; readonly value: number }[]): Mood {
  const at = (id: string): number => axes.find((axis) => axis.id === id)?.value ?? 50;
  const playful = at('serious-playful');
  const avantgarde = at('classic-avantgarde');
  const expressive = at('sober-expressive');
  if (playful >= AXIS_HIGH) return 'warm';
  if (avantgarde >= AXIS_HIGH && expressive >= AXIS_HIGH) return 'editorial';
  if (avantgarde < AXIS_LOW || expressive < AXIS_LOW || playful < AXIS_LOW) return 'strict';
  return expressive > 55 ? 'editorial' : 'strict';
}

const LEAD: Readonly<Record<Mood, number>> = { warm: 0, strict: 1, editorial: 2 };

/**
 * The composition of one page among the compositions of its type: the mood picks which one leads, then
 * each further page of the type moves one step on, so two pages of a type never show the same composition
 * (up to the number of compositions the type has; past it the list wraps).
 */
export function variantFor<T>(list: readonly T[], mood: Mood, occurrence: Occurrence): T {
  const size = list.length;
  const at = (LEAD[mood] + occurrence.index) % size;
  const picked = list[at];
  if (picked === undefined) throw new Error('variantFor needs a non-empty list');
  return picked;
}
