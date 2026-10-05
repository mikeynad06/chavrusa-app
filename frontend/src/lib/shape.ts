// Light runtime checks on API responses. TypeScript types don't protect us at runtime: a proxy error page,
// an empty body or a changed API can hand a component something it can't render. Pages use these to show
// a calm "couldn't load" message instead of crashing. Each check covers the fields the UI actually reads.
import type { StudyRequest } from '../types/request';
import type { Match } from '../types/match';
import type { ChatMessage } from '../types/message';
import type { UserProfile } from '../types/profile';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const hasName = (v: unknown) => isObj(v) && isStr(v.id) && isStr(v.name);

export function isStudyRequest(v: unknown): v is StudyRequest {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.topic) &&
    // RequestCard formats these, so a missing one would crash the card
    isStr(v.level) &&
    isStr(v.timeSlot) &&
    isStr(v.modality) &&
    isStr(v.language) &&
    (v.location === null || isStr(v.location)) &&
    isStr(v.requesterId) &&
    hasName(v.requester)
  );
}

export function isMatch(v: unknown): v is Match {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.matchedUserId) &&
    hasName(v.matchedUser) &&
    isObj(v.request) &&
    isStr(v.request.topic) &&
    hasName(v.request.requester)
  );
}

export function isChatMessage(v: unknown): v is ChatMessage {
  return isObj(v) && isStr(v.id) && isStr(v.senderId) && isStr(v.body);
}

export function isUserProfile(v: unknown): v is UserProfile {
  return (
    isObj(v) &&
    isStr(v.name) &&
    isStr(v.email) &&
    Array.isArray(v.preferredTopics) &&
    v.preferredTopics.every((t) => isObj(t) && isStr(t.id) && isStr(t.topic)) &&
    Array.isArray(v.subscribedLocations) &&
    v.subscribedLocations.every((l) => isObj(l) && isStr(l.id) && isStr(l.location)) &&
    Array.isArray(v.requests) &&
    v.requests.every((r) => isObj(r) && isStr(r.id) && isStr(r.topic) && isStr(r.status))
  );
}

// A list response must be an array; individual malformed items are dropped (and logged) rather than
// failing the whole page. Returns null when the response isn't a list at all.
export function listOf<T>(data: unknown, isItem: (v: unknown) => v is T, what: string): T[] | null {
  if (!Array.isArray(data)) {
    console.error(`[api] Expected a list of ${what}, got:`, data);
    return null;
  }
  const items = data.filter(isItem);
  if (items.length < data.length) {
    console.warn(`[api] Skipped ${data.length - items.length} malformed ${what}.`);
  }
  return items;
}
