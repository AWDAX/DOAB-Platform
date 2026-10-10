# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, Antigravity, opencode, etc.) working in this repository. **Read this before making changes.**

---

## 🚀 Current phase — POST-HACKATHON: results pending — keep building to industry level (read first)

**SIH 2026 has concluded; the final team results have NOT been declared yet — treat our
status as PENDING. Do not claim selection, non-selection, or placement either way on any
surface.** The developer is now running DOAB as a production-grade product: keep
hardening + shipping features as if continuing solo for real users; if results later
declare otherwise, the work continues unchanged — only the public framing around
"results pending" can be updated then.

- Treat every change as **production software for real users** — not a demo/prototype. No hackathon hacks, no "it works on my machine" shortcuts.
- **Industry standards everywhere**: clean architecture, real security, automated tests, observability, accurate i18n (en/hi/sat via native checks), and documented ops on every feature/change.
- **Priority is hardening first, features second.** Follow the live backlog in `docs/DEV_SESSION_STATE.md` → "Phase 2 — production hardening backlog": rotate leaked credentials, VM SSH key-only, server-issued session tokens, strict Firebase verification, CI + secret scanning + dependabot, data durability, monitoring.
- **Never weaken the two Critical rules below** (secrets + no-false-claims). They now protect us **legally**, not just from judges. The product is independently built; it must STILL not claim government/institution affiliation, real partnerships, or movement of real funds.
- **Credentials are high-value now.** Anything that ever appeared in chat/session logs is considered exposed (session text persists in local `.opencode/*.db`) — rotate it. Service-account JSON and keys NEVER go into the repo or chat; keep them as env vars / `chmod 600` files on the VM.
- When uncertain whether a change is "industry standard", apply the "Industry standards & assumption-checking" section below and state a clear recommendation rather than guessing.

---

## 🛡️ Critical: NEVER commit credentials, secrets, or sensitive identifiers (read first)

**Absolute rule — no exception, no `--no-verify`:**

- **Never commit any real credential**: API keys, tokens, `client_secret`, passwords, connection strings, private keys, or secrets of any kind.
- **Never commit `.env` / `.env.*` files.** They are gitignored. Only `.env.example` (with **placeholders only**) may be tracked.
- **Never commit sensitive deployment identifiers**: real Azure VM names, public IPs, subscription IDs, or connection endpoints.
- **Never hardcode keys in source** — read them from environment/`.env` at runtime (e.g. `import.meta.env.VITE_GROQ_API_KEY`, `process.env.*`).
- **Docs must be credential-free.** Any doc referencing an API/credential uses placeholder values only (e.g. `your_api_key`, `my-vm`, `my-rg`).

**Enforcement:** a pre-commit guard (`.githooks/pre-commit`, installed via `core.hooksPath`) blocks commits that stage `.env` files or high-confidence credential signatures. Do **not** bypass it.

**Before every commit/push:** check `git status` + `git diff --cached` for `.env` or credentials, and run the staged-secrets scan. If the hook fires, unstage/redact and re-review — never force-commit.

---

## ⛔ Critical: NEVER add anything that gets us disqualified (read first)

**Absolute rule — no exception.**

This is an **independently built civic-technology product** (origin: Smart India Hackathon
SIH26043, which is over). The developer has NO authorization from, or partnerships with, any
government body, university, or company. Never ship text, metadata, imagery, or claims that
make it look official, state-operated, or institution-endorsed.

**Forbidden on ANY surface users can see, share, or that crawlers index** — this includes
`index.html` `<head>`, `SEO.jsx` defaults, JSON-LD/structured data, the `<noscript>` block,
the public landing page, `og:`/`twitter:`/`author`/geo meta tags, `og-image`, and visible copy:
- Claiming authorship by or affiliation with any real government body (e.g. "Government of
  Jharkhand, Department of Higher and Technical Education"), or implying official/state operation.
- Claiming partnership, involvement, endorsement, sponsorship, or data/funding from any **real
  named institution or company** (e.g. BIT Mesra, NIT Jamshedpur, IIT(ISM) Dhanbad, Birsa
  Agricultural University, Tata Steel, Coal India, JSLPS, NABARD, Jindal Steel) — unless that
  entity has actually agreed, which we must **assume NOT**.
- Asserting concrete real-world operational facts we do not have (e.g. "4,500+ Pragya Kendras",
  "100+ University Laboratories", live district/node counts, disbursed grants).
- Impersonating real handles (e.g. Twitter `@JharkhandGov`) or setting `author`/geo tags that
  assert real institutional presence.
- Any claim of real permissions, deployments, or third-party credentials we haven't obtained.
- Claiming to actually **hold, move, or disburse third-party/escrow money**, or describing a live
  financial arrangement with real CSR/industry sponsors. Escrow accounts, RBI/banking handling, and
  CSR disbursement under the Companies Act are regulated activities a student team cannot claim to
  have built. Refer to the **"proposed CSR co-funding model"** ONLY — never imply funds are actually
  held or moving; name no real sponsor as the source of funds.
- Calling our database record-keeping **"immutable"** or **"cryptographically verifiable"** (e.g. "SHA-256
  immutable/cryptographic academic credits ledger"). MongoDB/PostgreSQL/Typesense are not immutable or
  hash-chain-verifiable by default. Unless a real hash-chained append-only mechanism is implemented, call
  it what it is: an **audit trail / signed log**. If we later add a genuine hash chain, then the term may
  return — until then drop "immutable"/"cryptographic".

**Required for public/indexed surfaces:**
- Frame everything as a **student concept/prototype** for the Smart India Hackathon (SIH26043) —
  phrase with "concept", "prototype", "targets", "intended to", "example"; never present-tense claims.
- Replace real institution/company names with **generic or explicitly "example/hypothetical"**
  labels (e.g. "Example Research Partner", "Example CSR Sponsor") on public pages.
- Include a visible **disclaimer** on the public landing page and in the `<noscript>` fallback
  (e.g. "Project Concept — student prototype. Not affiliated with or endorsed by any listed
  institution, company, or government body.").
- When in doubt about a phrase, **ask/flag rather than ship**.
- Describe CSR as a **"proposed" or "intended" co-funding model** ("proposed CSR co-funding model"),
  never as active escrow/holding of funds.
- Describe the credits/ledger as an **audit trail or signed log**, not "immutable"/"cryptographic",
  unless a real hash-chain mechanism exists.

**Allowed:** authenticated demo dashboards (behind login) may show hypothetical partners ONLY if a
clear "demo/illustrative data" notice is present (existing pattern on `Governance`/`kiosk` pages).
Keep real names off any public/indexed surface.

**Alternative — the ONLY legitimate way to demo real fund *movement* (future work):** use a **sandbox/test
mode payment processor** (RazorpayX Test Mode — best fit for ₹/Indian CSR framing, or Stripe Test Mode) with
**test keys only** and fake money. This is what hackathon teams do: wire a sandbox processor behind the
existing simulation (escrow orchestration + `EscrowLedger` are already built as a demo), label everything
"sandbox / simulated — no real funds", and optionally add the processor (test mode) to the tech-stack diagram
so the stack-vs-escrow gap is owned. A student team must **never** hold/move real third-party funds;
real custody requires a licensed intermediary + a registered merchant entity. If sandbox keys are not yet
available, keep the simulated model rather than claiming real payments.

**Enforcement (before every commit-push):** grep changed files for `Government of Jharkhand`,
`@JharkhandGov`, and the named-entity list above; if any appears on a public/indexed surface or
lacks demo/example framing, fix before committing. See `docs/GITHUB_PROFILE.md` "Accuracy rules"
(established precedent: Bhashini = future idea only).

---

## 🌀 Mandatory: ALWAYS pull from GitHub before every session (read first)

**Absolute rule — no exception:**

- **Before doing anything** (editing, building, starting the dev server, planning, or running tests) at the
  start of a session/after a break, always run a pull to sync local branches with remote. The working copy often
  shows stale, previously-committed state until you pull, which has caused confusion ("why did my design revert?").
- On the current branch (or after switching to a working branch), run `git pull` (or `git pull --rebase`) first.
- Make sure you are on the correct branch before pulling (see Branch workflow below). Pull before every commit batch
  to avoid non-fast-forward rejections.
- Only after pulling should you examine `git status`, read `docs/DEV_SESSION_STATE.md`, and start working.

---

## 🚨 Critical: UTF-8 Encoding & Mojibake (read first)

This repo is **UTF-8 only**. It contains non-ASCII text that is easy to corrupt:
- Devanagari (Hindi): e.g. `सहनिर्माण`
- Ol Chiki (Santali): e.g. `ᱥᱟᱱᱛᱟᱲᱤ`, `ᱫᱟᱜ_ᱵᱤᱥ`
- Em dashes `—`, bullets `•`, box-drawing chars `┌─┐│└┘`, emoji `🤖🌐🎨`

### How corruption happened before (do NOT repeat)
In commit `fed9c66` ("rebrand: DOAB → DOAB") several files were read as **UTF-8**, misinterpreted as **Windows-1252/Latin-1**, then **re-saved as UTF-8**. This produced **mojibake** — garbage like:
- `â€”` instead of `—`
- `â€¢` instead of `•`
- `à¤¸à¤¹à¤¨...` instead of `सहन...`
- `\x8f`, `\x80` C1 control characters

Affected files that were repaired: `README.md`, `How_To_Run.md`, `UI_DESIGN_SYSTEM.md`, `Checklist.md`, `Potential_Future_Improvements.md`, `apps/client-pwa/index.html`, `apps/ai-service/routers/federated_learning.py`.

### Rules
1. **Always read and write files as UTF-8.** Never open/save with a "system default" or cp1252/Latin-1 encoding.
2. **Never do lossy decode/encode round-trips** (e.g. `bytes.decode('latin-1')` then re-encode to UTF-8) on existing non-ASCII content.
3. **Do not strip `BOM` (U+FEFF) unless it's a deliberate, repo-wide, tested change.** A prior commit removed all BOMs; only reintroduce if following that established convention.
4. On **Windows**, Python stdout defaults to cp1252 — if a script prints non-ASCII, add:
   ```python
   import sys; sys.stdout.reconfigure(encoding="utf-8", errors="replace")
   ```
5. **Preserve non-ASCII** when editing: keep exact Devanagari/Ol Chiki/em-dash/emoji characters intact. Don't "normalize" them to ASCII.

### How to verify you didn't introduce mojibake
Scan touched files for mojibake signatures or C1 control characters (U+0080–U+009F):
```bash
# C1 control chars (bad)
grep -P "[\x80-\x9f]" <file> && echo "MOJIBAKE DETECTED"
# common double-encode signatures
grep -Pe "â€|Ã©|Ã¨|à¤|á±|Â·|Â°" <file> && echo "MOJIBAKE DETECTED"
```
If you touched non-ASCII files, confirm they still decode cleanly as UTF-8 and contain the expected characters before committing.

---
## 🌐 Mandatory: Multi-language coverage (i18n) for every feature

The PWA must support all **three** languages everywhere: `en`, `hi` (Devanagari), `sat` (Ol Chiki).

**Rules:**
1. **Every new user-facing string must be translated to ALL 3 languages.** This applies to:
   - Strings routed through the i18n library (i18next keys used via `t.` inside components, pulled from `apps/client-pwa/src/i18n/translations.js`).
   - **Hardcoded strings too.** Any literal visible text (`<span>Text</span>`, `title=`, `placeholder=`, `aria-label=`, `alt=`, button labels, toast/=`messages`) must go through the `t` translator (or be added as keys) in **en, hi, and sat**.
2. **Never leave a user-visible string hardcoded** in a component (pages, components, dashboard shell, role pages). Always route through `t` via `useLanguage()`.
3. When adding a new key tree to `translations.js`, mirror the exact same key path in `en`, `hi`, and `sat` — all three must exist or the fallback will silently show the English/raw-key text.
4. Dynamic data (user/DB content) does NOT need translation — only static UI chrome.
5. Do not translate brand names (`DOAB`, `ClusterGuilders` is kept as-is in English; `CLUSTERGUILDERS`) or technical tokens like `SIH26043`.
6. On Windows, verify touched translation files still decode as UTF-8 (no mojibake) — see mojibake rules above.

### Translation must be REAL and language-accurate — never literal/transliterated (read first)

- **Never write a "fake" translation** — i.e. don't just copy/transliterate the English word into the script and claim it's
  the translation. `Log Out` must NOT become a meaningless or literal pseudo-Hindi/Santali rendering; it must be the
  **real, natural phrase a Hindi/Santali speaker would actually use** (e.g. `बाहर निकलें`/`साइन आउट`, not a word-for-word mashup).
- **Always verify each translation** rather than assuming it's right. When adding/editing a `hi` or `sat` string, confirm the
  word/phrase genuinely exists and is the natural, correct equivalent in that language. If unsure, say so and flag it for a
  native-speaker review or provide the closest correct phrasing — do not ship a guessed/dubious string as if it were correct.
- **Respect grammar/syntax of the target language**, not English word order. Adjectives, plurals, honorifics, and sentence
  structure differ (e.g. Hindi uses postpositions, Devanagari conjunct characters, gendered agreement; Santali/Ol Chiki has
  its own morphology). A sentence must read naturally in the target language, not be an English sentence with swapped words.
- **Keep meaning + tone, not a dictionary swap.** Translate intent and tone (formal/civic, friendly, imperative), not just
  tokens; the translated string should carry the same meaning a native reader would infer from the English.
- **When in doubt, mark it for review.** Add a `// TODO(native-check): verify <key>` comment rather than silently shipping
  a possibly-wrong translation, so it gets a native-speaker pass before going live.

**Verification (run before commit):**
```bash
# 1. Confirm en/hi/sat all export and parse
node --input-type=module -e "import('./apps/client-pwa/src/i18n/translations.js').then(m => console.log(Object.keys(m.TRANSLATIONS)))"
# 2. Grep for un-translated hardcoded text (review any hits)
rg -n '>[A-Z][A-Za-z ]+<' apps/client-pwa/src --glob '*.jsx' | head -50
# 3. Confirm a sample key resolves in all three languages (expect 3 lines of output)
```

📖 **Full i18n developer guide:** [`docs/i18n-guide.md`](./docs/i18n-guide.md)  
📋 **Translation coverage status:** [`docs/LOCALIZATION_STATUS.md`](./docs/LOCALIZATION_STATUS.md)

---

## ⚖️ FAQ content contract (read first when FAQ text or a feature/framing changes)

The landing-page FAQ lives in `apps/client-pwa/src/i18n/translations.js` under `faq.items`
(mirrored in all three languages: `en` ~:275, `hi` ~:1419, `sat` ~:2564).

1. **Hard cap:** `faq.items` must never exceed **6 entries** in ANY language. The parity guard
   `scripts/check-faq.js` (repo root, `backend` branch) enforces `<= 6` across en/hi/sat —
   run it before committing FAQ-related changes.
2. **Content contract (every entry must hold):**
   - factual, concept/prototype framing per the no-false-claims rule (no institution/fund claims);
   - reflects a real current capability or an explicitly-labeled "intended/concept" capability;
   - no stale claims left behind after a feature is removed or reframed.
3. **Sync rule:** a feature, framing, or capability change ⇒ update the affected FAQ entry **in the same
   batch** (en, hi, sat). Never change a feature without reconciling the FAQ that describes it.
4. Keep questions user-stated and plain ("Is my personal data safe?"), answers concise (≤2–3 sentences).

---

## 🧭 Mandatory: Sub-Tours / In-Service Walkthroughs for Portal Hub Services

Every major tool, module, and sub-service within the Portal Hub (e.g., `ProblemMap`, `CivicLeaderboard`, `PragyaKendraIntake`, `StateCommandAnalytics`, `CivicImpact`, `CSREscrowPortal`, `FederatedLearningDashboard`, `ConsortiumBuilder`, etc.) must have an interactive, localized in-service guided sub-tour (`ServiceTour.jsx`).

### Rules for New Services & Upgrades (Absolute Requirement)

1. **New Services Require a Sub-Tour:**
   - Whenever any new Portal Hub service, sub-service, or module is created, you **MUST** implement an in-service sub-tour for it in the same pass.
   - The sub-tour must provide a 30-second walkthrough highlighting key inputs, filters, actions, and output views.

2. **Upgrades & Additions Require Sub-Tour Updates:**
   - Whenever any existing Portal Hub sub-service is upgraded, redesigned, or has new features/controls added, its sub-tour **MUST** be updated to reflect the new capabilities.
   - Never leave obsolete tour targets or descriptions behind when upgrading a UI component.

3. **In-Service Tour Architecture & Integration Checklist:**
   - **Component Mount:** Mount `<ServiceTour serviceKey="<serviceKey>" />` inside the root container of the service.
   - **Header Trigger Button:** Include `<ServiceTourButton serviceKey="<serviceKey>" />` in the service header bar so users can re-trigger the walkthrough on-demand at any time.
   - **Target Elements:** Attach semantic `data-service-tour="<target-name>"` attributes to key containers and interactive controls.
   - **Step Definitions:** Add the step array in `SERVICE_TOUR_CONFIGS` inside `apps/client-pwa/src/components/ServiceTour.jsx`.
   - **Polyglot i18n Parity:** Add matching `serviceTours.<serviceKey>` translation blocks in `apps/client-pwa/src/i18n/translations.js` across **ALL 3 languages**: English (`en`), Hindi (`hi` in Devanagari), and Santali (`sat` in Ol Chiki).
   - **Design Standards:** Maintain the monochromatic obsidian/porcelain minimalist design system. Never use colored beacons, blinking arrows, or raw emojis in tour tooltips.

---

## 🎬 Demo & Simulation Scripts (mandatory for demo-worthy features)

Whenever a feature, simulation, or flow is added that needs to be *demonstrated* at hackathon
evaluation (e.g. Federated edge training, Consortium MOU execution, CSR milestone escrow, Living
Lab telemetry, Problem Map triage, Kiosk offline sync), ship a runnable demo/script in the SAME
batch as the feature. Never leave a demo-worthy feature with no way to showcase it.

### Rules

1. **Place them in `scripts/demo/`** — one subfolder per feature, containing:
   - A **Windows batch file** (`NN_<feature>.bat`, zero-indexed for run order) that starts anything
     needed locally (dev servers, seeders, simulators) and prints clear step-by-step instructions.
   - The simulation script itself (`.bat`, `.js`, `.py`) that drives a hands-off, deterministic
     walkthrough of the feature.
   - A **`README.md`** how-to inside the folder: prerequisites, one-command start, what the viewer
     should look for on screen (what to click, what changes, expected timings/labels).
2. **Runnable & safe:** scripts must be re-runnable (idempotent), respect `%~dp0`, encode UTF-8
   (BOM-free), define `chcp 65001` + console `echo` hex hints where useful, and NEVER hit real
   externals — simulate locally only (no secret keys, no real network calls, no real funds).
3. **Deterministic & self-documenting:** fixed seed/fixtures so the demo output is predictable;
   echo each stage so the operator knows what to say/point at during the pitch.
4. **i18n/design note:** demo output copy follows the same monochrome + en/hi/sat rules as the app
   where practical; never introduce disqualified claims (mock/named institutions → "Example ..."
   or "Proposed" framing only).
5. **Routing:** `scripts/` lives on the **`backend`** branch; commit the scripts + `README.md`
   there with `[skip ci]` (Vercel quota). Keep `scripts/demo/README.md` current every time a demo
   script changes or a demo-worthy feature lands.
6. **Mandatory pairing:** when adding a demo-worthy feature, create its demo script + runbook in
   the same pass you add the feature (mirror of the Sub-Tours rule above). Verify the script runs
   (`cmd /c scripts\demo\NN_<feature>.bat`) before committing.
7. **Keep the runbook + index current:** the canonical how-to-run reference is
   `scripts/demo/README.md` (launcher table, feature→script map, first-run caveats). Whenever you
   add or change a script, update that README **and** the live script index below in the **same
   commit** — a demo script that isn't documented does not count as shipped.

### How to run & test features with the demo scripts (live index)

> One command from a **Windows Terminal / PowerShell** at the repo root (Git Bash: read each
> `.bat` and run the same `node`/`npm` commands directly):
> `cmd /c scripts\demo\NN_<feature>.bat`. Scripts are idempotent and run against local services
> only. `scripts/demo/README.md` is the full runbook; the index below is the at-a-glance map.

| Script | What it runs | Feature(s) it verifies |
|--------|--------------|------------------------|
| `01-start-mesh.bat` | Docker Compose mesh (MongoDB/Redis/Typesense) + deps + seed | local infra bring-up |
| `02-seed-demo-data.bat` | Re-seeds deterministic demo reports/MOUs/escrow/telemetry | seed data |
| `03-run-pwa.bat` | Client PWA dev server (`http://localhost:5173`) | all UI features |
| `04-capture-demo-screens.bat` | Puppeteer screenshot capture → `artifacts/screenshots/mobile/` | pitch-deck slide assets |
| `05-test-tts.bat` | ai-service `/tts` (EN/HI neural, SAT fallback) | localized read-aloud |
| `06-trustcore-loop.bat` | Self-contained trust-core sim (in-memory Mongo + app on ephemeral port) | photo-proof → VLE attest (+25) → govt resolve → certificate + honor roll; `REPORT_RECEIVED`/`PROOF_VERIFIED`/`AI_VERIFICATION_COMPLETE`/`MILESTONE_APPROVED` inbox + read/clear; govt-only audit trail; anti-sybil 409 |

**When does a new feature need a script?** Anything that must be *demonstrated* (see the section
header) gets `NN_<feature>.bat` (+ driver + runbook row + this index row) in the same batch.

---
## Repo overview

**DOAB (SIH26043)** — "Societal Innovation Collaboration Portal" for the Government of Jharkhand. A polyglot monorepo bridging citizens, universities, industry, and government.

Polyglot monorepo:
```
DOAB_(CrowdSourcing)/
├── apps/
│   ├── client-pwa/          # React 18 + Vite + Tailwind + PWA + Bubblewrap TWA
│   ├── core-api/            # Node.js + Express + Mongoose + Typesense
│   ├── university-service/  # Java 21 + Spring Boot 3.3 + PostgreSQL
│   └── ai-service/          # Python 3.11 + FastAPI + PyTorch + Sentence-BERT
├── contracts/               # JSON Schemas & OpenAPI specs (single source of truth)
├── infra/                   # Docker Compose mesh, Redis, Typesense, MongoDB configs
├── public/avatars/          # offline WebP team/contributor assets
├── scripts/                 # data seeding & system init
└── docs/                    # technical documentation & architecture blueprints
```

Brand identity:
- English: **DOAB** (was "DOAB" before rebrand — do not reintroduce the old name)
- Hindi (Devanagari): `सहनिर्माण`
- Santali (Ol Chiki): `ᱥᱦᱱᱤᱨᱢᱟᱧ`

---

## Languages & frameworks

| Service | Stack |
|---|---|
| client-pwa | React 18, Vite, Tailwind, PWA (workbox), Google Bubblewrap TWA |
| core-api | Node.js, Express, Mongoose (MongoDB), Typesense search |
| university-service | Java 21, Spring Boot 3.3, PostgreSQL, RBAC |
| ai-service | Python 3.11, FastAPI, PyTorch, Sentence-BERT, Groq (Qwen 3.8B) client |

---

## Commands

```bash
# seed demo data
npm run seed

# e2e test (puppeteer)
npm run test:e2e

# docker mesh
docker-compose -f infra/docker-compose.yml up --build -d

# client dev
cd apps/client-pwa && npm install && npm run dev   # http://localhost:5173
```

---

## 🔐 Secrets — NEVER commit these

- **Groq API key**: read from `import.meta.env.VITE_GROQ_API_KEY` (client-pwa) — see `apps/client-pwa/src/hooks/useGroqChat.js`. **Never hardcode a real key in source.**
- `.env*` files are gitignored except `.env.example`. Read real credentials at runtime from the external credentials doc — **never write passwords/secrets into the Codebase.**
- Rotate any key that has ever been pushed publicly (history is not erased by a later commit).

---

## Committing

- UTF-8 files, LF-friendly. (BOMs were stripped repo-wide in commits `cea30e3`/`1dc1f11` — keep them off.)
- Use concise conventional-commit messages, e.g. `fix:`, `feat:`, `docs:`, `refactor:`.
- Match the existing style (see `git log --oneline`).
- **Never commit secrets.** Check `git status`/diff for `.env` or hardcoded keys before staging.
- **Commit as you go.** Commit each logically-complete batch on its correct branch (`frontend`/`backend`/`docs`),
  then push, rather than letting many changes pile up uncommitted. When you finish a task/batch, commit it in the
  same pass you update `docs/DEV_SESSION_STATE.md` — never leave a completed piece of work uncommitted at session end.
- **Commit + push as you go with no confirmation needed.** Commit each logically-complete batch to its correct
  branch (`frontend`/`backend`/`docs`) and push immediately, WITHOUT asking for confirmation — unless the user
  explicitly asks to wait/confirm. Run the staged-secrets scan every time and never push if the secret-guard
  fires. If there are no errors, commit and push; only pause on a real error or an explicit "wait" request.

---

## 🌿 Branch workflow — push branches; merge into `main` only with developer approval (read first)

**Never work directly on `main`.** `main` is the integration/truth branch and only ever receives **merges**
(branch → `main`). All real work happens on the three long-lived feature branches, then merges back so `main`
is always current and deployable.

**Routing (what goes where):**
- `frontend` → everything under `apps/client-pwa/` (React/Vite/Tailwind/PWA/TWA).
- `backend` → `apps/core-api/`, `apps/ai-service/`, `apps/university-service/`, `infra/`, `contracts/`, `scripts/`.
- `docs` → `docs/`, repo-root meta (`AGENTS.md`, `README.md`), root-level planning/`*.md` files.

**Push loop (developer approval is mandatory before any `main` merge):**
1. Before editing, `git stash`/checkout the correct branch for the work (switch to `frontend` / `backend` / `docs`;
   never build on `main`).
2. Commit each logically-complete batch on that branch (secret-guard first — see top rules), then push
   (`git push origin <branch>`).
3. **Stop after pushing the feature branch. Do NOT merge into `main` locally or push to it directly —
   `main` is protected by a GitHub branch ruleset (created 2026-09-16).** The ruleset requires a **pull request
   before merging** into `main` + **required status checks** (`core-api-tests`, `gitleaks`) + **block force
   pushes**. A local `git merge --no-ff <branch> && git push origin main` will be **rejected by GitHub**. The
   only merge path is a **PR** (CI runs on the PR via the existing `pull_request:` trigger in `ci.yml`):
   ```bash
   gh pr create --base main --head <branch> --title "merge: <branch> -> main" \
     --body "Test gate: core-api 146/146 + gitleaks green on <branch> (per AGENTS.md)"
   # wait until BOTH required checks show green on the PR, then merge (--merge keeps a merge commit):
   gh pr merge <branch> --merge
   ```
   (Or create/merge from the GitHub UI.) The developer must still verify the exact commit and explicitly give
   permission before merging — never open or merge a PR into `main` without approval. Note: the ruleset does
   **not** require linear history or review approvals, so our existing `--no-ff` merge-commit style and solo
   flow both still work. Then switch back to the working branch for the next batch.
4. Resolve merge conflicts on the working branch (rebase that branch on updated `main`) — never leave `main`
   in a broken state.

**🚦 Test-gate rule — ALL tests must pass before ANY merge into `main` (absolute, read first):**
1. **No merge to `main` unless every automated test suite is green.** Before merging any feature branch
   into `main`, run the full core-api suite (`cd apps/core-api && npm test`) and confirm **0 failures**
   (currently **146/146**). A single failing/flaky test blocks the merge — no exceptions, no "the failures
   are unrelated to my change."
2. **Run the suite *on the exact commits being merged*** (on the feature branch after it is rebased on current
   `main`, or on `main` after a trial merge) — never on stale code. If the tests flake **once**, stop the merge,
   investigate the root cause, and fix it before merging (do not re-run and hope — a re-run that passes after a
   failure means the test is racy and must be hardened, not ignored).
3. **Reproduce fixes:** if a fix targets a flaky test, run that test file in isolation at least 5× and the full
   suite at least 3× to confirm stability before merging.
4. **Frontend changes** additionally require a green `vite build` (`cd apps/client-pwa && npm run build`) before
   merging.
5. The **CI run on GitHub** (`CI / core-api-tests` + `gitleaks`) must also be green for the merged `main`; do not
   merge in a way that knowingly leaves CI red (e.g. avoid `[skip ci]` on the exact commit that fixes/validates CI).
6. Leave the test-gate results in the merge commit message or `docs/DEV_SESSION_STATE.md` (e.g. "suite 146/146
   green on main before merge") so the gate is auditable.

**Sessions may end with `main` behind:** unless the developer has explicitly approved the exact commit,
leave the work on its feature branch and do not merge or push `main`. Update `docs/DEV_SESSION_STATE.md`
in the same pass before/with the branch commit.

**🖥️ VM deployment-sync rule — keep the live VM on latest `main`, booting only when needed (absolute, read first):**
1. **Deploy new `main` to the VM whenever merged changes require it.** After a merge to `main` that touches
   anything the VM runs (any `apps/core-api/` / `infra/` / `scripts/` change — NOT pure `docs/`/`frontend`,
   which deploy via CF/Vercel), the VM must be synced to that `main` + the API restarted.
2. **Boot the VM with the Azure CLI (not the portal):**
   ```bash
   source scripts/.azure-vm.env.local && bash scripts/azure-vm.sh start
   ```
   Then wait for SSH (`for i in $(seq 1 20); do ssh -o ConnectTimeout=5 -o BatchMode=yes vm true && break; sleep 10; done`).
3. **Check the SSH source-IP allowlist BEFORE `ssh vm` (mandatory).** The operator's public IP changes
   (mobile/home ISP) while the NSG `SSH` rule stays pinned to an old `/32` — that makes `ssh vm` time out
   silently. Before attempting SSH:
   - get the current public IP: `curl -s https://api.ipify.org`
   - read the allowlist: `az network nsg rule show -g "$AZURE_RESOURCE_GROUP" --nsg-name "$AZURE_NSG_NAME" --name SSH -o json | grep sourceAddressPrefix` (sourcing `scripts/.azure-vm.env.local` first)
   - if they differ, update before SSH:
     `az network nsg rule update -g "$AZURE_RESOURCE_GROUP" --nsg-name "$AZURE_NSG_NAME" --name SSH --source-address-prefixes <current-ip>/32`
4. **Pull + redeploy on the VM** (folder is `~/DOAB_Crowdsourcing`, the old name):
   ```bash
   ssh vm 'cd ~/DOAB_Crowdsourcing && git pull origin main && cd apps/core-api && npm ci --omit=dev && pm2 restart DOAB-api'
   ```
   Never `git reset --hard` blindly — the VM keeps untracked `.env.bak-*` / `infra/backups/` that must stay.
5. **Verify the app is live** before deallocation: `ssh vm 'pm2 status DOAB-api | grep online'` and, if reachable,
   `curl -s https://api.DOAB.live/api/v1/health`.
6. **Deallocate when done** — compute is only billed while the VM is Running (~$13/mo vs ~$5/mo deallocated):
   ```bash
   bash scripts/azure-vm.sh deallocate
   ```
   Leave the VM OFF until something actually needs the live site; make cost the default unless the developer asks otherwise.
7. **Log the deploy** (new `main` SHA + "deployed to VM + deallocated") in `docs/DEV_SESSION_STATE.md` in the same pass.

---

## ⚡ Vercel Deployment Quota Optimization (100 Deployments/Day Limit)

Vercel Hobby plan has a hard limit of **100 deployments per 24-hour rolling window**. Pushing to ANY tracked branch triggers a preview deployment that consumes this quota unless instructed otherwise.

**Rules:**
1. **Always use `[skip ci]` or `[skip vercel]` on non-frontend commits:**
   - Any commit on `docs`, `backend`, `infra`, `scripts`, `contracts`, or repo-root markdown files (`AGENTS.md`, `README.md`, `DEV_SESSION_STATE.md`) that does not modify `apps/client-pwa/` must include `[skip ci]` in the commit message.
   - Example commit messages: `docs: update session state [skip ci]` or `fix(api): update rate limiter [skip ci]`.
   - Vercel automatically skips the build on commits tagged with `[skip ci]` or `[skip vercel]`, consuming **zero** deployments from the daily quota.
2. **Batch commits logically on feature branches:**
   - Avoid rapid micro-pushes after single-line edits. Commit when a feature milestone is complete and locally verified with `npm run build`.
3. **Keep `main` deployments intentional:**
   - Merging into `main` creates a Production deployment. Never merge to `main` without developer verification and approval.

---

## Known pitfalls / legacy notes

- **Mojibake history**: see top section. Be especially careful when any tooling auto-normalizes or re-encodes markdown with non-ASCII or emoji.
- **Old folder/brand remnants**: the VM folder is still `~/DOAB_Crowdsourcing` (old name, correct code). Physical folder names may differ from the brand; don't "correct" them based on brand alone.
- **Repo on Windows**: console codepage is cp1252; use UTF-8 reconfigure in scripts that print non-ASCII (see top).

---

## 🏭 Industry standards & assumption-checking (read first when the user proposes a change, feature, or asks an opinion)

**Goal: ship clean, industry-ready code that follows accepted conventions — not just what "looks" right or is easy.**

- **Always question the user's assumption.** When the user says "should we do X?", "can we/do we want X?", or proposes a
  feature/design change, do NOT just agree and implement. First evaluate whether the premise itself is correct,
  whether it's a real problem/need, and whether it matches how production software is actually built.
- **Check + cite industry standards.** For any UI/UX/architecture/naming/questionable-pattern decision, state what the
  industry standard is (e.g. account menu + avatar dropdown, logout at bottom separated by divider, modal-confirm for
  destructive actions, mobile-first responsive breakpoints, a11y — click-outside/Escape to close, keyboard nav, labels,
  contrast) and whether the proposal aligns or deviates. Prefer the established convention unless there's a strong,
  defensible reason to deviate.
- **Give a recommendation.** After explaining the standard, say clearly what you recommend and why, then ask whether to
  proceed (or proceed if the user already confirmed the direction). Offer alternatives ranked by how standard they are.
- **Keep it concise.** Offer the analysis + recommendation in a compact form (a few bullets), don't write an essay.
- **Don't blindly implement a user's first idea.** If a user's proposed approach conflicts with the standard or a better
  convention exists, say so and propose the standard alternative. Implement after the user agrees (or if direction is
  unambiguous and low-risk, implement the standard version).
- **Code quality bar:** ship code as an industry-ready product would — clean, consistent naming, i18n in all three
  languages (en/hi/sat), no dead code/unused imports, accessible markup, and matching existing repo conventions.

---

## 🎨 UI/UX craft rules — minimalism, effort-minimization, best practice (read first when building/editing UI)

**Guiding principle: we build UI *for* the user experience. Design decisions serve the user's ease and clarity first —
visual flair is secondary and never at the cost of usability.**

- **Minimalism by default.** Prefer clean, uncluttered interfaces: one primary action per view, no decorative
  elements that don't carry meaning, restrained color/effects. "If in doubt, leave it out." Remove redundant text,
  borders, shadows, icons, and motion that add noise without value.
- **Minimize user effort — always.** Every flow/control should require the **least possible effort & fewest taps/clicks** to complete the task:
  - sensible defaults pre-selected; progressive disclosure (show advanced/complex options only when needed).
  - clear, short labels; placeholders that indicate expected format; validation guidance inline (not after submit).
  - one obvious primary CTA per screen; secondary actions visually subordinate.
  - remember prior choices (persist user preferences) so they don't re-enter them each time.
  - fast paths: keyboard support, quick actions, prefilled/common values.
- **UX before UI.** Make sure the *interaction model* is sound (what happens, when, feedback on every action) before
  polishing pixels. Every user action needs clear feedback (loading, success, error, empty states) — never leave the
  user guessing whether something worked.
- **Follow industry UI/UX practice + best design patterns:** established, proven patterns over invented ones —
  e.g. standard component hierarchy, consistent spacing scale, conventional placement (nav in header, avatar-menu
  bottom logout, modal for destructive confirm), mobile-first layout, touch targets ≥44px, color/contrast that meets
  readability (WCAG), and familiar iconography.
- **Write UI code following best practices & design patterns** too: reusable components (DRY), consistent naming,
  semantic HTML + proper aria, no inline magic numbers without reason, extract shared styles, and keep components
  decoupled/testable — not just "whatever renders".
- **Never leave a lone pair / solo element in the UI (hard rule).** No element, control, or layout unit may ever stand
  visually alone ("a lone pair") — e.g. a lone checkbox/icon/label/toggle/button hovering apart from its group, a single
  stray divider, an element floating with empty space around it while its neighbors are grouped, an ungrouped stat
  block, or a label with no visible control it governs. Every element must belong to a clear group, be visually
  connected to something it relates to, and sit within a defined container/relationship. If you can look at the screen
  and point to anything that "dangles alone," fix it before shipping.
- **Form validation asterisks (`*`) and required indicators must be strictly monochromatic.**
  Never use red, rose, or colored asterisks for required fields. Use neutral text tokens (`text-slate-400 dark:text-slate-500` or `text-current`). Maintain the pure obsidian monochromatic aesthetic across all intake and dashboard forms.
- **Read `UI_DESIGN_SYSTEM.md` before ANY UI/UX change (hard rule).** Before making any UI/UX change — and/or when a
  feature, component, or page touch involves UI (visual, layout, spacing, color, typography, motion, component
  anatomy) — first read `UI_DESIGN_SYSTEM.md` (repo root) and align to its documented patterns (palette, type scale,
  spacing, radius, shadows, component structure, motion). After building/editing any UI-involving feature, reconcile
  the change against that file: use its existing tokens/patterns, and if a change legitimately alters a stated
  convention, update `UI_DESIGN_SYSTEM.md` to match in the same batch. Never invent disjoint styles that contradict the
  design system.
- **Mandatory: Visual & Architectural UI/UX Consistency Across Portal Hubs (hard rule).** Every service hub
  (State Command, Problem Map, Kiosk, Consortium, CSR Escrow, Living Labs, NAAC Dossier, Federated AI, Civic Impact)
  must maintain strict visual and structural consistency with the rest of the platform:
  - Identical obsidian neo-glass card surfaces (`bg-white/80 dark:bg-[#0c0d12]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl rounded-3xl shadow-sm`).
  - Monospace tracking header tags (`text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400`).
  - Pure monochrome + amber highlights (`text-amber-600 dark:text-amber-400`, `bg-amber-500/10`, zero blue/green).
  - Uniform stat counter blocks (`border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 rounded-2xl`).
  - Symmetric data grids, clear breadcrumbs, responsive padding, and full 3-language multi-lingual coverage.
- **Layout Stability & Zero Layout Shift (CLS = 0) (hard rule).** Dynamic UI elements such as tab count badges, live counters, and table action buttons must NEVER cause jitter or shifting when switching tabs or loading data:
  - Tab numeric badges must use `font-mono tabular-nums min-w-[1.25rem] text-center` so changing digit counts (e.g. 8 vs 10) never alters tab button widths or shifts sibling tabs.
  - Action buttons in data table rows across sibling tabs must share identical fixed widths (`w-32 min-w-[8rem]`) and fixed table column widths (`w-36 text-right`) to prevent horizontal jumping when switching tabs.
  - Form validation asterisks (`*`), unit tokens (e.g. `PTS`), and required indicators must be strictly monochromatic (`text-slate-400 dark:text-slate-500` or neutral slate/white) matching our monochromatic theme — never colored orange/amber/red.
  - Severity alert badges (`Critical`, `High`, `Escalating`) use focused amber/orange hues for rapid emergency triage, while all background chrome remains strictly monochromatic.
  - **Zero Decorative Noise**: Never use pseudo-status pings (`animate-ping`) or ambiguous blobs as generic decorations. Reserve amber indicators strictly for genuine Critical/High urgent alerts.
- **Consistency reduces effort.** Reuse the same components, spacing, colors, and behavior across screens so the user
  doesn't relearn the interface; this is a core part of minimal effort + best practice.
- **Iterate if an element could be cleaner.** When adding UI, ask "can this be simpler?" and "does this follow the
  pattern the rest of the app already uses?" before shipping.

---

## 📋 Session state must always be current (read first)

- **Keep `docs/DEV_SESSION_STATE.md` up to date at the END of every working session/step.** It is the single source of truth for in-progress, uncommitted work and the todo list, so a reopened session resumes without losing context.
- **Update the todo list AND `docs/DEV_SESSION_STATE.md` after EVERY change** — not just at session end. In each pass: (1) mark the just-finished item `done`/`in_progress` in the working TODO, then (2) mirror that into `docs/DEV_SESSION_STATE.md` before/with the commit. Do not batch all state-saving to the end; keep state current after each batch so a session can resume mid-way without drift.
- **Keep the interactive working TODO current after every single change.** Immediately after each edit, build, or commit — before moving on — update the working todo list (via the todo tool / `todowrite`) to reflect the exact new state: mark what you just finished as `completed`, flip the next one to `in_progress`, add any newly-discovered follow-up items. Never let the in-session todo linger out of sync with what has actually been done. This is a hard rule, not a nice-to-have: a stale todo is how work gets silently dropped or duplicated.
- When you start working, **read `docs/DEV_SESSION_STATE.md` first** and reconcile its todo list with reality (`git status`, `git log`).
- When you mark a todo done / add a todo / commit a batch / change direction, **update `docs/DEV_SESSION_STATE.md` in the same pass** (before or with the commit that reflects the change).
- Never let the session file drift: if you complete a task, check it off there; if you start a task, mark it `in_progress` there.
- The session file is a **working log**, not user-facing docs — it lives on the `docs` branch like other working docs.

## 📖 README & CHANGELOG curation (read first when the public surface changes)

The README is the repo's **stable front door** — editable rarely and deliberately, never churned per batch:

- **Update `README.md` at MILESTONE boundaries only**: when a user-facing capability, supported language/platform, install/run flow, or stack component changes — and always **before a `main` merge/release**. Do not log every feature batch (that noise belongs in `CHANGELOG.md`/`DEV_SESSION_STATE.md`).
- **`CHANGELOG.md`** (repo root, Keep a Changelog format) holds the granular user/operator-facing history. Add an entry per batch that lands on `main`; keep the top-most section `## [Unreleased]`, and keep entries truthful per the no-false-claims rule (concept/prototype framing; no institution/fund-affiliation claims).
- Keep the **working** history in `docs/DEV_SESSION_STATE.md` (see above) — it is internal, the README/CHANGELOG are public surface. Apply README/CHANGELOG edits on the `docs` branch with `[skip ci]` (repo-root markdown routing).

---

## 🔁 Continuous work until all items are complete

**Do not stop or ask for permission mid-flow.** Once work is in progress, the agent must keep iterating until
**every** pending item is done — no half-finished batches, no "I'll continue later" pauses.

- **Work through the full plan.** Keep executing until all items in the active plan (planned steps, backlog items,
  and any `pending`/`in_progress` entries in `docs/DEV_SESSION_STATE.md`) are marked `completed`.
- **Don't pause between completed items.** When one task finishes, immediately move to the next pending one in the
  same pass — don't stop to ask or announce unless blocked by an unknown that genuinely requires user input.
- **Only stop when truly blocked or everything is done.** Stop only if: (a) every planned + in-progress item is
  done and pushed/merged, (b) a task requires a real decision or input only the user can provide, or (c) the user
  explicitly says to stop.
- **If the session appears to be ending with items incomplete**, complete as many as possible in the current pass,
  commit + push + update `docs/DEV_SESSION_STATE.md`, and clearly note what remains — but only stop mid-flow if
  truly blocked by missing info, not from forgetting to continue.

## 🧭 Product-first technology and feasibility rules

- **The product idea leads; technology serves it.** Choose the smallest, most appropriate and efficient
  technology or stack that strengthens the core user problem, reliability, accessibility, maintainability,
  and delivery speed. Do not add a framework, service, or effect merely because it is fashionable; every
  technical choice must have a clear product benefit.
- **Evaluate ideas end to end before committing to them.** Examine the idea from first principles through
  its final form: user value and benefits, weak points and risks, feasibility and genuine technical barriers,
  total cost (money, time, performance, operations, developer experience, and user effort), privacy and
  accessibility, and whether the expected value justifies those costs. Try practical alternatives to make
  a valuable idea feasible; drop it when a genuine barrier remains disproportionate to its benefit.
- **Use design thinking when ideating.** Start with the people and context, define the real problem, generate
  alternatives, prototype the smallest useful flow, test it with evidence, and iterate. Do not let an
  implementation constraint define the problem prematurely.
- **Use calm, purposeful motion.** Page, modal, FAQ, AI window, and layout transitions should be smooth and
  brief enough to preserve orientation without delaying users, and must respect `prefers-reduced-motion`.
- **Avoid sparkle/gemini-style decoration.** Do not introduce sparkle emoji, sparkle icons, or sparkle SVGs
  as generic product decoration or button affordances; use clear, professional semantic iconography instead.

## 🧭 Keep the dashboard onboarding tour (react-joyride) in sync with every feature

The dashboard ships a first-time, role-aware onboarding tour built with `react-joyride`
(`apps/client-pwa/src/components/DashboardTour.jsx`). The tour is a living contract with
our users — it must never become stale or it misleads stakeholders about what they can do.

- **Whenever you add, change, rename, or remove ANY dashboard feature, tab, control, or
  capability for ANY stakeholder role (citizen, Village Service Staff, government officer,
  HEI/CSR), update `DashboardTour.jsx` in the SAME batch/commit.** Do not ship a dashboard
  change that the existing tour does not accurately reflect.
- **Synchronize the tour when:**
  - a role gains or loses a nav tab or primary action → add/remove/update that role's steps;
  - an existing anchor element's `data-tour-*` selector, label text, or path changes → fix the
    matching step so its target still resolves;
  - a step's copy (en/hi/sat) no longer matches the UI or terminology → update it.
- **Step coverage:** at least one step should reference the role's primary reporting/action tab,
  the map, and the AI Copilot orb, per the confirmed design (auto-on first login, one-time flag,
  localized, re-runnable). Keep steps focused (4–6) per role.
- **When a tour-target element is removed or renamed, remove or retarget its step** — a tour step
  pointing at a missing selector silently skips and looks broken.
- To verify after a dashboard change: run the dev build and confirm `DashboardTour.jsx` compiles
  and the targeted `data-tour-*` selectors still exist in the rendered dashboard.

## 🧭 Role-aware mobile/tablet bottom navigation — keep in sync with the role's services

The PWA shows a mobile/tablet bottom tab bar (`App.jsx` — `bottomBarActive` gate `:156`,
bottom bar markup `:552`) that must reflect **exactly the services that stakeholder role can
actually open**. It is a living contract with stakeholders just like the onboarding tour.

- **Whenever a service/tab is ADDED, REMOVED, RENAMED, or role-scoped differently for ANY
  stakeholder** (citizen, Village Service Staff/VLE, government officer, university, industry),
  verify the mobile/tablet bottom nav in the SAME batch/commit:
  - every bottom-bar entry must map to a tab the role can legally open (never render a button
    whose target tab is outside the role's `roles:` scope in `getNavItems()` — tapping it would
    silently reset to the default tab);
  - the bottom bar's item set, SVG icons, and order match the role's primary services on small
    screens (don't leave a service reachable only from the sidebar on mobile/tablet, or show a
    service in the bottom bar that the role cannot open);
  - badge counts/labels stay tabular (`font-mono tabular-nums`) so counts never shift layout;
  - labels come from `t.dashboard.nav.*` / `t.dashboard.bottom*` and exist in **en, hi, sat**;
  - `DashboardTour.jsx` VLE/citizen/other step lists stay in sync with whatever the bottom bar
    shows (see tour rule above).
- **Industry standard:** bottom navigation = at most 5 top-level destinations, icon + short label,
  respect `pb-[env(safe-area-inset-bottom)]`, active state monochrome (amber only for genuine
  critical/high urgency), one raised primary-action FAB (e.g. Report). Non-primary/secondary
  destinations belong in the header/overflow, never cram the bottom bar.
- **Zero dead-ends on mobile:** any role that can reach a service from the desktop sidebar must be
  able to reach it from mobile/tablet (bottom bar, header menu, or in-page CTA) — never let a
  feature become desktop-only without a plan.
- To verify after a nav change: run the dev build, then eyeball the mobile/tablet breakpoint
  (`< 768px`) for each role and confirm the bottom-bar buttons open their targets.

## 🧭 Stakeholder Service Audit Rule — keep every role scoped to services it actually uses (read first)

Every stakeholder role (citizen, Village Service Staff/VLE, government officer, university, industry/CSR)
should only see services that genuinely belong to that role's workflow. Before adding, removing, editing, or
re-scoping a service tab for any role, run this checklist in ONE pass and reconcile all affected surfaces:

1. **Role-scope check:** update `getNavItems()` roles in `App.jsx`, the role-aware mobile/tablet bottom bar
   (`ROLE_BOTTOM_ITEMS` in `App.jsx`), `DashboardTour.jsx` `ROLE_STEPS`, and any in-page FAB default. A service
   removed from a role must vanish from the sidebar, the bottom bar, and the onboarding tour in the same batch.
2. **Completeness:** roles that *can* open a service must be able to reach it from mobile **and** desktop
   (no desktop-only dead-ends, no bottom-bar button whose tab the role cannot open).
3. **Value (avoid over-servicing):** the service must carry a real workflow action for that role. Contributions
   that belong to another role's workflow (e.g. a verification/spotting feed for a CSR sponsor, or a leaderboard
   with no category for that role) are noise — cut them unless a role-specific view exists.
4. **Feature-sufficiency:** if the audit reveals a genuinely valuable capability the role lacks (e.g. a
   "CSR Sponsors" leaderboard tab when sponsors want visibility), prompt the user rather than silently shipping.
5. **Monochrome iconography:** every nav/bottom-bar/tour icon stays pure monochrome (slate/neutral) with amber
   reserved for genuine critical/high urgency — no brand/role icon gets its own color.
6. **Functionality (no broken states for that role):** verify the role can actually open the service, its default
   tab resolves, and any `activeTab` fallback still lands on a scoped tab; run the build and eyeball at
   320/375/768/1024 after the change.

When the user asks "does role X need this service?" treat it as a Stakeholder Service Audit request: apply this
checklist, say what you would cut/keep/add and why, and ask before changing scope.

## 📱 Small-screen & responsive mandates (mobile / tablet)

Apply these rules to ANY UI change that could render differently below `lg` (1024px). Verify at
the standard breakpoints before committing.

1. **Canonical breakpoint contract.** Use ONLY Tailwind defaults — `sm` 640, `md` 768, `lg` 1024,
   `xl` 1280, `2xl` 1536. Never introduce arbitrary per-file numeric breakpoints; if a new
   breakpoint is truly needed, add it to the Tailwind config AND document it in
   `UI_DESIGN_SYSTEM.md`. Verify every UI change at 320 / 375 / 768 / 1024 / 1440 widths.
2. **Dynamic viewport units & zero horizontal scroll.** Use `100dvh` / `min-h-[100dvh]` (not
   `100vh`) for full-height panes/modals so mobile browser chrome never mispositions; guard every
   layout with `overflow-x-hidden` + `max-w-full` so nothing forces sideways scrolling.
3. **No iOS auto-zoom on inputs.** Inputs, selects, and textareas must be `text-base` (16px) or
   larger on mobile — iOS zooms the page when focusing any control <16px. Never compensate with
   `transform: scale()`.
4. **Responsive tables → cards on small screens.** Structural data tables in the Portal Hubs must
   collapse to stacked card layouts below `md` (or sit in an explicitly labelled horizontal-scroll
   container). Never force side-scrolling a Hub table on a phone.
5. **No hover-only interactions.** Every control must be fully usable via tap (`onClick`/touch or
   keyboard); `hover:` styling is enhancement only — if a hover menu/state hides the only path to an
   action, it breaks mobile/tablet.
6. **Touch targets & spacing on tight widths.** Keep taps ≥44px; on the tightest 320px edge,
   ensure labels don't wrap awkwardly; safe-area padding (`pb-[env(safe-area-inset-bottom)]`) on
   bottom bars/FABs (see role-aware bottom-nav rule); `env(safe-area-inset-top)` below notches.
7. **Reduced-motion & animation on small screens.** Respect `prefers-reduced-motion`; heavy scroll
   effects/particle/kinetic animation should degrade gracefully on low-power mobile (see curvy-arrow
   and footer-scroll-top design rules).
8. **Verify rule.** After any responsive change, run the build and visually check 320/375/768/1024
   at minimum (mobile nav, tables/cards, inputs, charts, modals) — not just the desktop view.

## 📱 Small-screen & responsive mandates (mobile / tablet)

The PWA must behave as a first-class product on small screens, not a shrunken desktop. Apply
these rules to ANY UI change and re-verify per breakpoint before committing.

1. **Canonical breakpoint contract.** Use ONLY Tailwind defaults: `sm` 640, `md` 768, `lg` 1024,
   `xl` 1280, `2xl` 1536. Never introduce arbitrary per-file numeric breakpoints/custom media
   queries for one component; a deviation must be repo-wide and reconciled in
   `UI_DESIGN_SYSTEM.md`. Verify every UI change at **320 / 375 / 768 / 1024 / 1440** widths.
2. **Dynamic viewport units & zero horizontal overflow.** Use `100dvh`/`min-h-[100dvh]` (not
   `100vh`) for full-height panes/modals so mobile browser chrome never overflows. Guard every
   layout with `overflow-x-hidden`/`max-w-full` so nothing forces horizontal scrolling on a phone.
3. **No iOS input zoom.** Inputs, selects, and textareas must use `font-size` ≥ `16px`
   (`text-base`) on mobile — iOS auto-zooms the page when focusing any form control smaller than
   16px. Never compensate with `transform: scale()`.
4. **Tables collapse to cards below `md`.** Structural data tables in Portal Hubs must render as
   stacked cards on mobile (or live inside an explicitly labelled horizontal-scroll container).
   Never force sideways paging to read a Hub table on a phone.
5. **No hover-only interactions.** Every action must be tappable via `onClick`/`onTouchEnd`
   (or `onPointerUp`), never depend on `onMouseEnter`; hover styles are progressive enhancement
   only. Multiple quick actions must also expose keyboard/tap equivalence (real button elements,
   `aria-pressed` on stateful toggles).
6. **Safe-area insets on ALL fixed chrome.** Bottom bar, headers, FABs, and the AI copilot chat
   window pad with `env(safe-area-inset-bottom)` / `env(safe-area-inset-top)`; keep
   `viewport-fit=cover` in the PWA meta/manifest so notches/gesture bars never overlap content;
   re-check landscape orientation. (`prefers-reduced-motion` already governs all motion;
   `≤64px`-touch targets only on the tightest 320px edge, otherwise keep 44px.)

