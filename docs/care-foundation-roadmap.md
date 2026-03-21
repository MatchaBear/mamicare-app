# MamiCare Care Foundation Roadmap

Branch: `codex/glucose-wound-care-foundation`
Baseline UI reference: `main`
Status: planning branch only, production UI remains untouched on `main`

## Why This Branch Exists

MamiCare already does the most important first job well: it helps a family coordinate care together in one place.

The next step is not "more random features." The next step is turning MamiCare into a clearer recovery support system for:

- blood glucose tracking
- wound healing observation
- medication adherence
- clinic instruction memory
- family coordination under Indonesian care-system friction

The guiding rule for this branch is:

- keep the home experience familiar
- preserve the current warm, large-touch-target mobile UX
- evolve the data model so the app can connect events instead of storing everything as loose text

## Current Product Strengths

- very fast caregiver logging
- shared multi-device sync
- simple elderly-friendly input flow
- realtime household visibility
- low cognitive load

## Current Product Gaps

- most medical meaning is flattened into `summary` text
- no dedicated blood glucose model
- no wound photo timeline
- no doctor instruction memory
- no explicit relationship between meal, meds, glucose, and wound state
- no household auth or access model beyond local device picker
- no structured appointment / BPJS / cost tracking

## Product Strategy

Build MamiCare in 3 layers:

1. Care Core
2. Care Memory
3. Care Intelligence

Each layer should still work on low-end phones, slow internet, and shared caregiver usage.

## Recommended Release Path

### v1.5.0 — Care Core

Goal: capture the most clinically useful home signals without making the app harder to use.

Features:

- blood glucose logging
- wound red-flag checklist
- doctor instruction ledger
- better daily summary cards
- patient-specific glucose targets
- soft alerting for dangerous values or wound warning patterns

Success criteria:

- caregiver can log a glucose result in under 10 seconds
- wound condition can be documented more precisely than free text alone
- family can see today's key risk signals at a glance
- app can answer basic questions like:
  - was glucose checked today?
  - was dressing changed today?
  - are there red-flag wound symptoms?
  - was medicine skipped near an abnormal glucose reading?

### v1.6.0 — Care Memory

Goal: make clinic visits and wound progress easier to remember and share.

Features:

- wound photo upload with compression
- side-by-side wound photo timeline
- appointment tracker
- BPJS / FKTP / referral notes
- medication schedule with planned versus actual dose timing
- PDF export for doctor visits

Success criteria:

- family can bring a 7-day or 14-day summary to the clinic
- photos are usable but compressed enough for low storage and low bandwidth
- instructions from a visit stop getting lost in chat or memory

### v1.7.0 — Care Intelligence

Goal: connect the dots across recovery, food, meds, glucose, and wound healing.

Features:

- relationship graph between care events
- trend dashboard
- pattern summaries
- weekly caregiver summary
- rule-based reminders
- "please review" queues for unresolved abnormal readings

Success criteria:

- family sees patterns, not just raw events
- the app surfaces follow-up tasks without pretending to be a doctor
- clinic conversations become faster because the history is organized

## Exact UX Direction

Keep `main` as the visual reference.

Do not replace the current "big buttons + bottom sheet modal + timeline" design.

Instead, evolve it like this:

### Home Screen

Keep:

- fixed header
- hydration hero card
- quick-log buttons
- today's timeline

Change:

- add a second top summary card for glucose
- expand quick actions from 3 to 5:
  - Makan
  - Obat
  - Luka
  - Gula Darah
  - Instruksi
- add a small "today status strip" above timeline with chips:
  - gula terakhir
  - obat terakhir
  - luka dicek
  - perban diganti
  - alarm jika ada red flag

### Glucose Logging Flow

Modal title:

- `🩸 Catat Gula Darah`

Flow:

1. numeric reading field in `mg/dL`
2. context choice:
   - puasa
   - sebelum makan
   - 2 jam sesudah makan
   - sebelum tidur
   - sewaktu
3. optional symptom chips:
   - lemas
   - pusing
   - gemetar
   - berkeringat
   - mual
   - tidak ada keluhan
4. optional "terkait dengan" selector:
   - makan terakhir
   - obat terakhir
5. notes
6. save

After save:

- timeline card shows value and context
- badge color reflects range based on patient target settings
- low and high values are visible without scaring the user

### Wound Logging Flow v2

Keep the current modal feel, but make the structure more useful:

1. overall status:
   - membaik
   - stabil
   - memburuk
2. appearance checklist:
   - kering
   - basah
   - kemerahan
   - bengkak
   - cairan
   - bau
   - luka terbuka
   - kehitaman
3. warmth toggle:
   - lebih hangat dari biasa
4. pain level:
   - tidak nyeri
   - ringan
   - sedang
   - berat
5. dressing changed:
   - ya / belum
6. photo attach
7. notes

Red-flag UX:

- if caregiver selects combinations like `bau + cairan + kemerahan`, show a calm banner:
  - `Tanda luka perlu diperhatikan. Sebaiknya hubungi dokter / klinik.`

### Doctor Instruction Flow

New modal:

- `🧾 Instruksi Dokter`

Fields:

- clinic / doctor name
- visit date
- next review date
- dressing instructions
- allowed cleaning method
- medication changes
- activity restrictions
- warning signs to watch

This should create a visible "current care plan" card on the home screen until replaced.

### Timeline Evolution

Keep one shared timeline.

Add clearer event cards:

- `💧 Minum`
- `🍽️ Makan`
- `💊 Obat`
- `🩹 Luka`
- `🩸 Gula`
- `🧾 Instruksi`

Each card should show:

- time
- summary
- logger
- key structured badges when available

Examples:

- `🩸 128 mg/dL · Puasa`
- `🩹 Memburuk · Kemerahan · Ada cairan`
- `💊 Metformin · Sudah diminum`

## Recommended Data Model

There are 2 realistic ways forward.

### Option A — Minimal Change, Faster Delivery

Keep `logs` as the main table, but add structure:

- `category text`
- `payload jsonb`
- `severity text`
- `patient_id text`
- `actor_id text`
- `related_to bigint[]` or relation table
- `is_red_flag boolean`

Use `summary` only as display text.
Put real values in `payload`.

Recommended `payload` examples:

Glucose:

```json
{
  "reading_mg_dl": 128,
  "context": "fasting",
  "symptoms": ["none"],
  "related_meal_id": 123,
  "related_med_id": 456
}
```

Wound:

```json
{
  "overall_status": "stable",
  "appearance": ["redness", "discharge"],
  "warmth": true,
  "pain_level": "mild",
  "dressing_changed": true
}
```

Pros:

- easiest migration from current code
- keeps one timeline query
- fastest route to shipping

Cons:

- analytics gets messier over time
- relational queries become harder

### Option B — Relationship-First Model

Create these tables:

- `households`
- `people`
- `care_events`
- `care_event_links`
- `care_plan_notes`
- `wound_photos`
- `medication_plans`
- `appointments`

Recommended `care_events` fields:

- `id bigint`
- `household_id uuid`
- `patient_id uuid`
- `actor_id uuid`
- `event_type text`
- `occurred_at timestamptz`
- `display_date date`
- `display_time text`
- `summary text`
- `notes text`
- `severity text`
- `is_red_flag boolean`
- `payload jsonb`
- `source_device text`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended `care_event_links`:

- `from_event_id bigint`
- `to_event_id bigint`
- `link_type text`

Link types:

- `after_meal`
- `after_medication`
- `same_wound_cycle`
- `follow_up_to_instruction`
- `same_day_cluster`

Pros:

- best for long-term insights
- cleaner future dashboards
- better for doctor summaries and alerting

Cons:

- bigger migration
- requires more UI plumbing

### Recommendation

Start with Option A in `v1.5.0`.
Design the code so it can evolve into Option B later.

That means:

- keep the current timeline mental model
- store structured payload now
- avoid hardcoding assumptions into `summary`
- introduce explicit relationships where needed

## Proposed Database Additions for v1.5.0

If you stay close to the current app, add:

- `type = 'glucose'`
- `type = 'instruction'`
- `payload jsonb`
- `severity text`
- `is_red_flag boolean default false`

If `logs` already exists in production, the least disruptive migration is:

1. add `payload jsonb default '{}'::jsonb`
2. add `severity text`
3. add `is_red_flag boolean default false`
4. keep old rows valid
5. update save handlers one event type at a time

## Recommended Clinical Product Rules

These are app-support rules, not treatment rules.

- allow patient-specific glucose target settings
- ship safe defaults but label them as defaults
- show low/high highlighting, not diagnosis
- if glucose is below configured low threshold, show "check again / follow care plan / consider contacting clinician if symptoms"
- if wound logs contain red-flag combinations, show "contact clinic / surgeon"
- never tell the caregiver to change dressings, antibiotics, or wound products without clinician instruction

## Indonesia-Specific Product Opportunities

### Diet Pattern Support

Build for common local patterns, not imported diet jargon.

Suggested meal quick tags:

- nasi putih
- bubur
- mie instan
- roti
- teh manis
- gorengan
- buah
- tempe / tahu
- ikan
- sayur bening

Also add a simple "plate balance" prompt inspired by `Isi Piringku`:

- lebih banyak sayur
- porsi nasi sedang / kecil
- ada lauk protein
- minum air, bukan minuman manis

### Care-System Friction

Because continuity is hard, add:

- clinic notes
- referral notes
- BPJS coverage notes
- appointment memory
- out-of-pocket spend log

### Family Coordination

The app should treat the family as the care unit.

Good future additions:

- assigned caregiver today
- unresolved task list
- reminder acknowledgement
- weekly WhatsApp-style summary export

## VPS Utilization Plan

Your VPS is useful if kept small and boring.

Good uses for a `1 GB RAM / 15 GB free` VPS:

- nightly encrypted database export
- image compression worker for wound photos
- cron-based reminder scheduler
- weekly caregiver summary generation
- PDF export worker
- uptime / backup monitoring

Not recommended on this VPS:

- self-hosting the main database
- self-hosting Supabase
- full-size image archive without compression
- on-server AI inference

Recommended architecture:

- Vercel: frontend
- Supabase: primary database + storage + auth
- VPS: background jobs, backups, image resizing, summaries

## First Implementation Slice

Build this first before bigger visual redesigns:

1. add `glucose` log type
2. add `payload`, `severity`, `is_red_flag` support
3. create `GlucoseModal`
4. add glucose quick action on home
5. add glucose card on timeline
6. add daily glucose summary on recap
7. add settings for target range defaults

This slice is high-value because it improves care immediately while keeping the UI recognizable.

## Second Implementation Slice

1. evolve `WoundModal` into red-flag structured logging
2. add wound risk banner
3. add doctor instruction modal
4. add "active care plan" card to home

## Third Implementation Slice

1. add wound photos
2. compress on device or via VPS worker
3. add photo timeline
4. export visit summary PDF

## Guardrails

- main remains the visual benchmark
- avoid sudden full-screen navigation complexity
- avoid medical over-automation
- optimize for stressed caregivers, not power users
- every new form must still be finishable one-handed on a phone

## What "Done" Looks Like

MamiCare should eventually help your family answer:

- how was her sugar today?
- what happened before that reading?
- was medicine taken?
- how does the wound look compared with last week?
- what exactly did the doctor tell us to do?
- what should we bring to the next visit?

That is the product direction for this branch.
