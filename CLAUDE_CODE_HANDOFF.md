# ChavrusaApp — Handoff Brief for Claude Code

## Project
Full-stack study-partner matching platform.
- **Backend:** NestJS, TypeScript, Prisma ORM (PostgreSQL), JWT auth, class-validator DTOs. Runs on port 3000.
- **Frontend:** React, Vite, TypeScript, React Router, Axios, Tailwind CSS, Framer Motion, Lucide React. Runs on port 5173.

## What's already working
- User registration, JWT login, `POST /requests`, `GET /requests`, `POST /matches/claim/:requestId` all functional on the backend.
- Event-driven notifications: `request.created` fans out emails to users subscribed (via `UserTopic` + `UserLocation`) to that topic/location; `match.claimed` notifies the original requester. Currently just `console.log`s instead of real emails — no mail provider wired in yet.
- Frontend: `Login.tsx` authenticates against `/auth/login`, stores JWT in `localStorage`, and calls `navigate('/dashboard')`.
- Axios instance (`src/services/api.ts`) has a request interceptor that attaches the JWT from `localStorage` automatically.

## Critical gap — fix first
**`/dashboard` route does not exist.** `App.tsx` currently only has `/login` and a catch-all redirect to it. Login "succeeds" but then has nowhere to go. This blocks everything downstream and should be the first thing built, not the Landing/About pages.

## Fixes already applied (backend) — already done, don't redo
- `matches.service.ts`: now injects `EventEmitter2` and emits `match.claimed` *after* the transaction commits (not inside it, so a rolled-back transaction never triggers a false notification).
- `matches.service.ts` / `findAll()`: was leaking the full `User` row (including the password hash) via `include: { matchedUser: true }`. Fixed to `select: { id, name, email }` only.
- `matches.controller.ts`: `GET /matches` had no auth guard while the claim endpoint did — added `@UseGuards(AuthGuard('jwt'))`.
- `notifications.service.ts`: replaced N+1 query loop (one `findUnique` per matched user) with a single `findMany({ where: { id: { in: [...] } } })`. Also added proper `RequestCreatedEvent` / `MatchClaimedEvent` interfaces instead of `payload: any`.

## Known but not yet fixed — flag before touching these areas
- `RequestsService.create(data: any, ...)` should be typed as `CreateRequestDto`, not `any`.
- `RequestsService.findAllOpen()` doesn't include the requester at all — Dashboard cards need at least the requester's name, so this needs an `include`/`select` (careful: same password-leak trap as `matches.service.ts` — always `select` specific fields when including `User`, never `include: { requester: true }` unguarded).
- **Schema inconsistency:** `UserTopic.topic` is a proper `Topic` enum, but `UserLocation.location` is a raw `String`, not the `Location` enum. This is a real bug risk — a stored value like `"Tel Aviv"` instead of `"TEL_AVIV"` will silently never match in the notification query. Recommend a migration to change `UserLocation.location` to type `Location`.
- No pagination on `GET /requests` — fine for now, flag if the dataset grows.
- No subscription-management UI exists yet for `UserTopic`/`UserLocation` — users currently have no way to actually create these records from the frontend. This is a missing feature, not yet scoped into a page.
- Login page uses `alert()` for success/failure and inline `style={{}}` instead of Tailwind — fine as a placeholder, but should be replaced when this page gets revisited.
- No `ProtectedRoute` guard exists yet, and no logout mechanism anywhere in the frontend.

## Build order (agreed plan — please follow this sequence)
1. **`ProtectedRoute` component + auth context/hook** (e.g. `AuthContext` or `useAuth`) — checks for JWT in `localStorage`, redirects to `/login` if absent, exposes a `logout()` that clears the token. Foundational — everything else depends on this.
2. **`MainLayout`** — persistent Navbar (logo, nav links, top-corner Login/Dashboard-or-Logout button depending on auth state) wrapping all routes.
3. **`Dashboard` page** — fetch `GET /requests`, render as a Tailwind grid of cards. This is the missing page referenced by `Login.tsx`'s redirect.
4. **Rewrite `App.tsx`** — wire `MainLayout`, `ProtectedRoute`, and the new `Dashboard` into the route tree. Suggested shape:
   ```tsx
   <Route element={<MainLayout />}>
     <Route path="/" element={<Landing />} />
     <Route path="/about" element={<About />} />
     <Route path="/haskamas" element={<Haskamas />} />
     <Route path="/login" element={<Login />} />
     <Route element={<ProtectedRoute />}>
       <Route path="/dashboard" element={<Dashboard />} />
     </Route>
   </Route>
   ```
5. **Request Creation modal/form** — must map exactly to `CreateRequestDto` (see enums below).
6. **Claim button wiring** — `POST /matches/claim/:requestId`, handle success/error state, refresh the feed or optimistically update.
7. **Landing / About / Haskamas pages** — Framer Motion scroll effects, least backend-coupled, do last.

## Reference — Prisma enums the frontend forms must match exactly
```prisma
enum Topic { GEMARA HALACHA TANACH MACHSHAVA MUSSAR CHASSIDUT MISHNAH PARSHA MIDRASH OTHER }
enum LearningStyle { IYUN BEKIYUT DISCUSSION SHIUR_REVIEW TEXT_FOCUSED FLEXIBLE }
enum LearningLevel { BEGINNER INTERMEDIATE ADVANCED ANY }
enum LearningModality { IN_PERSON ONLINE EITHER }
enum Language { ENGLISH HEBREW EITHER }
enum RequestStatus { OPEN MATCHED CLOSED EXPIRED }
enum Location { JERUSALEM TEL_AVIV RAMAT_BEIT_SHEMESH TEANECK NEW_YORK LONDON OTHER }
enum TimeSlot { MORNING AFTERNOON NIGHT FLEXIBLE }
enum Timezone { ISRAEL EST PST GMT }
```

## `CreateRequestDto` shape (what `POST /requests` expects)
```typescript
{
  topic: Topic;                      // required
  seferOrTopic?: string;             // optional
  style: LearningStyle;              // required
  level: LearningLevel;              // required
  modality?: LearningModality;       // optional
  language?: Language;               // optional
  description: string;               // required
  location?: Location;               // optional
  timeSlot: TimeSlot;                // required
  timezone: Timezone;                // required
}
```
