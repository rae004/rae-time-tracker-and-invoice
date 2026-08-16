# Complete the Finalized-Invoice Snapshot

## Goal

Make a finalized invoice render identically forever, and split the two
operations currently conflated in one code path: rebuilding a PDF file
(a cache) and changing what an issued document says (an amendment).

## The defect

The codebase already commits to a principle — **a finalized invoice is an
immutable snapshot**:

- `Invoice.hourly_rate` is copied from the client (`# Snapshot from client`)
- `InvoiceLineItem` stores `project_name` / `time_entry_name` as denormalized
  strings, with `time_entry_id` nullable
- `is_finalized` blocks both update and delete

But the snapshot stops short. `pdf_service.generate_invoice_pdf` resolves 15
fields **live** at render time:

| Source | Fields |
| --- | --- |
| `profile` (live query) | name, address_line1, address_line2, city, state, zip_code, phone, email, payment_instructions |
| `invoice.client` (live FK) | name, address_line1, address_line2, city, state, zip_code, phone, service_description |

So the figures are frozen while the letterhead and bill-to float. Reprinting
an invoice later yields a different document bearing the same invoice number.

Compounding it, `download_invoice_pdf` only regenerates when `pdf_path` is
null. Once `finalize` sets that path the stale file is served forever, with no
path back through the UI.

This is not a missing feature. It is an unfinished one.

## Scope clarifications (per user)

- Refresh covers **both** issuer and bill-to.
- `service_description` is **invoice-level content**, not presentation. It gets
  its own column and is captured **at create**, alongside `hourly_rate` — not at
  finalize, and never inside `bill_to_snapshot`.
- Refresh must **never** touch `hourly_rate`, line items, or totals.
- Snapshots are taken at **finalize only**; drafts have none and render live.
- Backfill **all nine** existing finalized invoices from the current profile
  and client.
- Both actions surface on the invoice detail page; no auth gate (single user).
- CI gains the native GTK libraries so PDF tests actually run there.

## Design decisions

1. **JSONB, not flat columns.** `issuer_snapshot` and `bill_to_snapshot` are
   opaque presentation blobs: never queried, never joined, only rendered.
   Fifteen flat columns would double the table width and force a migration
   every time the letterhead changes shape.

   The model must declare it as
   `sa.JSON().with_variant(JSONB(), "postgresql")`, **not** bare `JSONB`.
   Tests build their schema with `Base.metadata.create_all` against
   **SQLite in-memory** (`TestingConfig`), and SQLite cannot compile `JSONB` —
   a bare declaration fails at `CREATE TABLE` and takes all 108 tests with it.
   Verified: the variant renders `JSONB` on Postgres, `JSON` on SQLite, and
   round-trips nested dicts on both. This mirrors how the existing models get
   away with `postgresql.UUID` — in SQLAlchemy 2 that subclasses the generic
   `Uuid` and degrades on its own; `JSONB` does not.

2. **One resolver, no duplicated fallback.** A single
   `build_render_context(session, invoice)` in `pdf_service` decides
   snapshot-vs-live and returns plain dicts. The template never branches on
   which source won; it just renders `issuer` and `bill_to`. This is the one
   place the fallback rule exists, and it is pure enough to unit test on the
   host without WeasyPrint.

3. **Two capture points, one rule each.** Invoice *content* (`hourly_rate`,
   `service_description`) freezes at create. Invoice *presentation*
   (`issuer_snapshot`, `bill_to_snapshot`) freezes at finalize. Stated once
   here so future fields have an obvious home.

4. **Fallback is permanent, not transitional.** After the backfill no existing
   row needs it, but drafts always will, and it keeps the renderer total.

## Files to change

### Backend

- **`migrations/versions/20260816_000000_invoice_letterhead_snapshot.py`** (new)
  - `revision = "005_invoice_letterhead_snapshot"`, `down_revision = "004_line_item_time_entry_name"`
  - Add to `invoices`: `issuer_snapshot` JSONB null, `bill_to_snapshot` JSONB
    null, `service_description` Text null, `letterhead_refreshed_at` timestamptz null
  - Data backfill in the same revision, guarded and idempotent: for finalized
    invoices only, where the snapshot is null, populate from the single
    `user_profiles` row and each invoice's joined `clients` row. Must no-op
    cleanly on an empty database — this migration runs on every fresh test DB
    and on container start via `entrypoint.sh`.
  - `downgrade()` drops all four columns.

- **`app/models/invoice.py`** — four new mapped columns. `service_description`
  documented as `# Snapshot from client` to match `hourly_rate`.

- **`app/services/pdf_service.py`**
  - `build_render_context(session, invoice) -> dict` — the resolver. Returns
    `issuer` and `bill_to` dicts from the snapshots when present, from live
    profile/client when null. Also resolves `service_description` from the
    invoice column, falling back to `invoice.client.service_description`.
  - `generate_invoice_pdf` consumes it and stops querying the profile directly.
  - Keep the function-local `from weasyprint import HTML`. It is why the suite
    imports cleanly without GTK, and the new resolver tests depend on that.

- **`app/services/invoice_service.py`**
  - `capture_letterhead(session, invoice)` — builds and assigns both snapshots.
  - `finalize_invoice` calls it before generating the PDF.
  - `create_invoice` captures `service_description` from the client, next to
    the existing `hourly_rate` capture.
  - `refresh_letterhead(session, invoice)` — re-captures both snapshots and
    stamps `letterhead_refreshed_at`. Asserts finalized. Touches nothing else.

- **`app/routes/invoices.py`**
  - `POST /invoices/<id>/pdf/regenerate` — rebuild from the stored snapshot.
    Idempotent, no domain meaning. 400 on a draft.
  - `POST /invoices/<id>/refresh-letterhead` — re-capture, then regenerate.
    400 on a draft.
  - `download_invoice_pdf`: also regenerate when `pdf_path` is set but the file
    is missing on disk. Seven invoices currently have `pdf_path = None` and no
    file; a stored path pointing at nothing should self-heal rather than 500.

- **`app/schemas/invoice.py`** — expose `service_description` and
  `letterhead_refreshed_at` on `InvoiceResponse`. Snapshots stay internal;
  the API returns rendered values, not the blobs.

- **`app/templates/invoice.html`** — swap `profile.*` for `issuer.*` and
  `client.*` for `bill_to.*`; `service_description` comes from the context.
  No conditional logic — the resolver already decided.

### Frontend

- **`src/pages/InvoiceDetail.tsx`** — two buttons on finalized invoices only.
  "Regenerate PDF" acts immediately. "Refresh Letterhead" opens a confirm
  dialog naming the risk (the client may hold an earlier copy), and shows
  `letterhead_refreshed_at` when set.
- **`src/hooks/useInvoices.ts`** — two mutations, invalidating the invoice detail query.
- **`src/types/`** — add the two new response fields.

### CI

- **`.github/workflows/ci.yml`** — add an apt step to `backend-tests`
  installing the same GTK set the api `Dockerfile` already lists
  (`libpango-1.0-0`, `libpangocairo-1.0-0`, `libgdk-pixbuf-2.0-0`, `libffi-dev`,
  `shared-mime-info`, `fontconfig`, `fonts-liberation`).

## Test strategy

Today there is **zero** PDF coverage — which is why the WeasyPrint 68→69 major
bump had to be smoke-tested by hand. Three layers, cheapest first:

1. **Resolver unit tests (host, no GTK).** The bulk of the value. Snapshot
   present wins over live; snapshot null falls back to live; a snapshot missing
   an individual key does not crash; `service_description` prefers the invoice
   column. This is where the conceptual rule is actually enforced.
2. **HTML render tests (host, no GTK).** Render the Jinja template directly and
   assert the issuer block reflects the snapshot, not the live profile. Catches
   template/resolver drift without touching WeasyPrint.
3. **PDF byte test (needs GTK).** One smoke test asserting `%PDF-` and non-zero
   length from the real template. Guarded with
   `pytest.importorskip("weasyprint")` so the host suite stays green, and it
   runs for real in CI once the apt step lands.

Plus service tests: finalize populates both snapshots; refresh changes the
snapshots and the timestamp but leaves `hourly_rate`, `subtotal` and `total`
untouched; refresh on a draft is rejected.

**The migration is not covered by pytest.** Tests build their schema with
`Base.metadata.create_all` on SQLite and never invoke Alembic, so `upgrade()`
and the backfill only ever execute against the dev Postgres container. Verify
them by hand there: `alembic upgrade head`, inspect the nine backfilled rows,
`alembic downgrade -1`, then upgrade again to confirm the guard makes a re-run
a no-op.

## Implementation order

1. Migration + model columns. Verify upgrade/downgrade on a scratch DB.
2. Resolver + its unit tests. Renderer still behaves identically — snapshots
   are all null, so every invoice takes the fallback path. Nothing observable
   changes yet.
3. Template swap + HTML render tests.
4. `capture_letterhead`, wire into `finalize`; `service_description` into
   `create_invoice`. New invoices now snapshot.
5. Backfill the nine existing invoices (via the migration).
6. Endpoints + service tests.
7. CI apt step + the PDF byte test.
8. Frontend actions.
9. Regenerate #1 and #2 and diff against the current files to confirm the
   snapshot path reproduces today's correct output.

Steps 1–3 are behaviour-preserving by construction, which makes the risky part
(4–5) land against already-tested plumbing.

## Risks

- **Backfill asserts today's profile was the profile at issue time.** False in
  the strict sense — #1 and #2 were finalized with placeholder details — but
  the corrected values are what those documents should say. Accepted knowingly.
- **Wrong letterhead now stays wrong** until someone presses refresh. This is
  the intended trade, but it is a real behaviour change from today's
  silently-self-correcting renderer.
- **The migration touches data, not just schema.** Guard it to finalized rows
  with null snapshots so re-running is safe, and make it tolerate an empty
  `user_profiles` table.
- **A refresh on a legacy invoice is a one-way transition** from live to
  frozen. Harmless, but worth knowing it is what the button does.
- **PDF tests will slow `backend-tests`** by roughly the apt install. The
  alternative is continuing to ship WeasyPrint upgrades with no coverage.
- **Tests run on SQLite, production on Postgres.** Beyond the JSONB variant
  above, this means the backfill SQL is exercised by exactly one environment.
  Keep it plain ANSI-ish SQL and verify against the container.

## Verification

- `docker compose exec -T api uv run pytest` — full suite in the container,
  including the PDF byte test.
- `./precheck.sh` before opening the PR.
- Regenerate #1 and #2; confirm correct letterhead, `TOTAL HOURS 17.63` and
  `$2,204.18` unchanged on #2.
- Confirm a draft still renders from the live profile.
