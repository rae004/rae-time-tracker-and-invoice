# Combine Same-Day Line Items by Project + Description

## Goal

When generating an invoice, roll up multiple time entries that share the same `(project, time_entry_name, work_date)` into a single line item with summed hours and amount. In the `CreateInvoice` preview, indicate which preview rows represent multiple combined entries.

## Scope clarifications (per user)

- Tags are **not** part of the grouping key — only project, description (`time_entry_name`), and date.
- Include/exclude toggling is **atomic**: clicking the checkbox on a combined row toggles every underlying source entry as a unit.
- Old (already-persisted) invoices stay as they are. Only new invoices created after this change use the combined layout.

## Design decisions

1. **Grouping happens server-side** in `create_line_items_from_entries` (`backend/app/services/invoice_service.py`). It is the single source of truth shared by `preview_invoice` and `create_invoice_from_entries`, so preview and the persisted invoice cannot drift apart.
2. **`time_entry_id` on combined rows** is `None`; for a "group" of one, the original `entry.id` is preserved. The DB column is already nullable — no migration.
3. **Surfacing group membership**: the preview line items get an extra field `source_entry_ids: list[UUID]`. This is preview-only metadata — it is **not** persisted on `InvoiceLineItem` and **not** part of the create payload.
4. **Atomic exclude UX**: keep the existing `excludedEntries: Set<string>` of entry IDs. Clicking a group's checkbox adds (or removes) every `source_entry_ids` at once. A group is "excluded" iff every one of its `source_entry_ids` is in the set. No second exclusion mechanism.
5. **Visual indicator**: italic gray subtext `(N entries combined)` rendered under the Description cell when `source_entry_ids.length > 1`. Singletons look identical to today.
6. **InvoiceDetail / PDF**: no changes — they render the persisted (already-combined) rows verbatim.

## Files to change

### Backend

**`backend/app/services/invoice_service.py`** — rewrite `create_line_items_from_entries`:

- Accumulate into a dict keyed by `(project_id, time_entry_name, work_date)`.
- Each group: sum `hours` (still quantized to `Decimal("0.0001")`); sum `amount`; capture `project_name` from any member; set `time_entry_id = entry.id if len(group) == 1 else None`; populate `source_entry_ids: list[UUID]`.
- Sort groups by `(work_date, project_name, time_entry_name)`; reassign `sort_order = i`.
- `create_invoice` already pulls only the keys it knows about, so the new `source_entry_ids` key is silently dropped on persistence — no change there.

**`backend/app/schemas/invoice.py`** — add `InvoicePreviewLineItem(InvoiceLineItemBase)`:

```python
class InvoicePreviewLineItem(InvoiceLineItemBase):
    time_entry_id: UUID | None = None
    source_entry_ids: list[UUID] = Field(default_factory=list)
```

Change `InvoicePreviewResponse.line_items` from `list[InvoiceLineItemCreate]` to `list[InvoicePreviewLineItem]`. Leave `InvoiceLineItemCreate` and `InvoiceLineItemBase` untouched.

**`backend/tests/test_invoices.py`** — new tests in `TestInvoiceService`:

- `test_create_line_items_combines_same_day_same_name` — three entries (two share key, one different) → 2 line items; combined item has summed hours, `time_entry_id is None`, `len(source_entry_ids) == 2`.
- `test_create_line_items_singleton_keeps_time_entry_id` — sole entry retains its original id and `source_entry_ids == [entry.id]`.
- `test_create_line_items_different_projects_not_combined` — same name + date, different projects → 2 items.
- `test_create_line_items_different_dates_not_combined` — same name + project, different dates → 2 items.
- `test_create_line_items_empty_name_combines_within_day` — both `name == ""` on same project/date → 1 combined item.
- Augment existing `test_create_line_items_quantizes_hours` and `test_create_line_items_preserves_empty_entry_name` to assert `source_entry_ids` is populated.
- Augment one preview-route test to assert `"source_entry_ids" in data["line_items"][0]`.

### Frontend

**`frontend/src/types/index.ts`** — add:

```ts
export interface InvoicePreviewLineItem extends InvoiceLineItemCreate {
  source_entry_ids: string[];
}
```

Change `InvoicePreview.line_items` to `InvoicePreviewLineItem[]`.

**`frontend/src/pages/CreateInvoice.tsx`**:

- New predicate `isExcluded(item)` = `item.source_entry_ids.length > 0 && item.source_entry_ids.every(id => excludedEntries.has(id))`.
- Checkbox `onChange`: if currently included → add all `source_entry_ids` to the set; else remove all. Disabled only when `source_entry_ids.length === 0` (defensive — shouldn't happen).
- Under the description cell, conditionally render `<div className="text-xs italic text-base-content/50">{n} entries combined</div>` when `source_entry_ids.length > 1`.
- Replace the two `!item.time_entry_id || !excludedEntries.has(item.time_entry_id)` filters (in `calculateAdjustedTotals` and `handleCreate`) with the new predicate negation.
- The tfoot total row uses the same predicate.
- When mapping `activeItems` to the create payload, strip `source_entry_ids` (it's not in `InvoiceLineItemCreate`).

**`frontend/src/pages/CreateInvoice.test.tsx`** — new/updated cases:

- Two preview line items sharing `(project, name, date)` render as one row + "(2 entries combined)" indicator.
- Clicking the checkbox on a combined row excludes all source entries; totals update.
- Singleton row renders without the indicator.
- The create payload sent to `useCreateInvoice` does NOT contain `source_entry_ids`.
- Update any existing assertions whose mock data inadvertently shares a group key.

### No changes needed

- `InvoiceLineItem` SQLA model and migrations — no schema change.
- `backend/app/templates/invoice.html`, `frontend/src/pages/InvoiceDetail.tsx` — render persisted (already-combined) rows verbatim.
- The `time_entry_name` feature is fully compatible; it now also serves as a grouping key.

## Implementation order

1. Backend grouping logic.
2. Backend preview schema (`InvoicePreviewLineItem`).
3. Backend tests.
4. Frontend types.
5. Frontend `CreateInvoice.tsx`.
6. Frontend `CreateInvoice.test.tsx`.
7. Full test/lint/typecheck pass; manual sanity check in dev server with a few same-day, same-name entries.

## Verification

```bash
cd backend && uv run pytest -q
cd frontend && npm test -- --run && npm run lint && npx tsc --noEmit
```