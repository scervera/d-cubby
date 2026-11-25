# Design system

How the web UI (`apps/web`) is styled. The look is media-first: flat neutral surfaces, no blur, no gradients, one accent colour, and thumbnails with as little chrome as possible. Dark is the primary theme; light must work equally well.

## Rules

1. **No colour values in components.** Colours live in `src/app/tokens.css` and nowhere else. Components use the utilities generated from them (`bg-surface`, `text-muted`, `border-line`, …).
2. **No `dark:` variants.** Token utilities change with the theme by themselves.
3. **Use the shared components** in `src/components/ui/` and `src/components/forms/fields.tsx` before writing markup for a button, input, dialog, panel, badge, menu, spinner or table.
4. **One primary button per view.** Everything else is `secondary` or `ghost`. Destructive actions are `danger-ghost` in lists and toolbars, and `danger` only on the button that confirms.
5. **The accent never touches media.** Controls drawn over an image sit on a neutral `bg-scrim` chip with `text-on-scrim`. Selection is an accent outline with an offset, not a tint.
6. **Depth comes from surface colour, not shadows.** The only shadow is `shadow-overlay`, for things that float: menus, dialogs, toasts.
7. **Motion is colour and opacity only**, 100–200ms. No lift, scale or slide on hover.
8. **Focus is global.** `:focus-visible` draws the outline for every element; do not add `focus:ring-*` or `focus:outline-none`.

`npm run lint:tokens` (in `apps/web`) fails on hex colours, Tailwind palette classes (`slate-500`, `bg-white`), `dark:`, gradients, blur, ad-hoc focus rings and arbitrary z-indexes. A line that must keep a literal (a colour the user chose, a white/black preview backdrop) is exempted with a `palette-ok` comment on that line.

## Tokens

| Utility suffix | Use |
|---|---|
| `canvas` | Page background |
| `surface` | Panels, sidebar, header, inputs |
| `raised` | Menus, dialogs, toasts |
| `sunken` | Thumbnail wells, progress tracks, log panes, neutral badges |
| `hover` | Hover fill, and the current item in navigation |
| `line` / `line-strong` | Dividers and panel borders / borders of inputs and other controls |
| `fg` / `muted` / `subtle` | Primary text / secondary text / metadata and placeholders |
| `accent`, `accent-hover` | Primary button fill, selection |
| `accent-text`, `accent-subtle` | Links and icons on a surface / selected chips, info notes |
| `on-accent` | Text on `accent` and `danger` fills |
| `danger`, `danger-hover`, `danger-text`, `danger-subtle` | Destructive actions and errors |
| `warning`, `warning-text`, `warning-subtle` | Warnings |
| `success`, `success-text`, `success-subtle` | Success |
| `backdrop` | Behind a dialog |
| `scrim`, `on-scrim` | Behind and on controls drawn over media |

Use them with any colour utility: `bg-surface`, `text-muted`, `border-line-strong`, `divide-line`. A bare `border` is already `line`.

Solid `success` and `warning` fills are for bars and dots only. For a label, use the `-text` colour on the `-subtle` background (the `Badge` tones do this).

Other tokens:

- **Radius:** `rounded-thumb` (4px: thumbnails, badges, menu items), `rounded-control` (6px: buttons, inputs), `rounded-card` (8px: panels, menus), `rounded-dialog` (12px).
- **Stacking:** `z-header`, `z-drawer`, `z-dropdown`, `z-modal`, `z-toast`. Dialogs are portaled and stack in the order they open.
- **Type:** Geist Sans for everything; Geist Mono through `text-meta` (small, tabular, `subtle`) or `font-mono` for sizes, dimensions, dates, counts, IDs and paths. Page titles are `text-xl font-semibold tracking-tight`; section titles `text-sm font-semibold`; body `text-sm`. No uppercase letter-spaced labels.

Both fonts are bundled (`src/fonts/`, SIL Open Font License); the app makes no font requests.

## Components

| Component | File | Notes |
|---|---|---|
| `Button`, `IconButton`, `ButtonLink`, `buttonClass` | `ui/Button.tsx` | Variants `primary`, `secondary`, `ghost`, `danger`, `danger-ghost`; sizes `sm`, `md`. `IconButton` requires `aria-label`. |
| `TextField`, `TextAreaField`, `SelectField`, `CheckField`, `FormError`, `inputClass`, `inputClassSm`, `labelClass`, `hintClass` | `forms/fields.tsx` | `CheckField` is a checkbox or radio with its label. Use the `*Class` exports for a bare control. |
| `Modal` | `ui/Modal.tsx` | The only dialog. Traps focus, locks scroll, closes on Escape. Put form buttons in `footer` and link them with the `form` attribute. `bare` gives a chrome-less full-screen layer. |
| `ConfirmDialog` | `shared/ConfirmDialog.tsx` | Confirmation for irreversible actions. |
| `Panel`, `PageHeader`, `EmptyState`, `Stat` | `ui/Panel.tsx` | Every page starts with `PageHeader`. |
| `Badge` | `ui/Badge.tsx` | Tags, statuses, counts. Tones `neutral`, `accent`, `success`, `warning`, `danger`. |
| `Menu`, `MenuItem` | `ui/Menu.tsx` | Action dropdowns; keyboard navigable. |
| `SegmentedControl` | `ui/SegmentedControl.tsx` | A choice that applies immediately (view mode, thumbnail size). |
| `Spinner`, `LoadingBlock`, `PageSpinner` | `ui/Spinner.tsx`, `ui/PageSpinner.tsx` | |
| `TABLE` | `ui/table.ts` | Class names for tables. |

A form in a dialog:

```tsx
const formId = useId()
<Modal
  title={t('form.createTitle')}
  onClose={onClose}
  footer={
    <>
      <Button variant="secondary" onClick={onClose}>{tCommon('cancel')}</Button>
      <Button type="submit" form={formId} loading={saving}>{t('form.create')}</Button>
    </>
  }
>
  <form id={formId} onSubmit={handleSubmit} className="space-y-4">
    <TextField id="name" label={t('form.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} required />
  </form>
</Modal>
```

## Checking a change

Run in `apps/web`:

- `npm run lint:tokens` for the rules above.
- `npm run shots` to photograph every screen in both themes at desktop and phone width into `screenshots/` (git-ignored). It needs `bin/dev` running and an owner or admin token:

  ```sh
  export SHOTS_TOKEN=$(cd ../api && bin/rails runner 'puts AuthToken.issue(User.find_by(role: "owner"))')
  npm run shots
  ```

  The first run adds sample files, a smart folder, a group and a drop zone, all named `shots-…`. `SHOTS_ONLY=library` limits the run to screens whose name contains that text; `SHOTS_LABEL=before` writes to `screenshots/before/`. Each folder also gets `contrast.json`, listing any text that fails WCAG AA contrast.

Do not run `npm run build` while `bin/dev` is running: both write to `.next` and the dev server breaks until it is restarted with that folder removed.
