# Migration Plan: Radix UI → Base UI (shadcn)

## Status
Base-UI backed shadcn components are installed. The `components/ui/` files already import from `@base-ui/react`. The remaining work is updating **application components** that still use old Radix API patterns.

---

## 1. Remove `asChild` from application components

Base UI does not use `asChild`. Instead, it uses a `render` prop for composition. The base-ui `DialogTrigger` and `AlertDialogTrigger` already render as `<button>` by default, so wrapping a `<Button>` child with `asChild` will break (double-nesting buttons or `asChild` being ignored/errored).

**Fix:** Replace `<Trigger asChild><Button>...</Button></Trigger>` with `<Trigger render={<Button ... />}>...</Trigger>`.

For `Badge`, the new component already accepts a `render` prop via `useRender`.

### Files to change:

| File | Line | Current | Change to |
|------|------|---------|-----------|
| `components/tweet-with-actions.tsx` | 290 | `<AlertDialogTrigger asChild><Button ...>` | `<AlertDialogTrigger render={<Button ... />}>` |
| `components/api-secret-dialog.tsx` | 83 | `<DialogTrigger asChild><Button ...>` | `<DialogTrigger render={<Button ... />}>` |
| `components/add-tweet-dialog.tsx` | 20 | `<DialogTrigger asChild><Button ...>` | `<DialogTrigger render={<Button ... />}>` |
| `components/filterable-tweet-feed.tsx` | 47 | `<Badge asChild variant={variant}><Button ...>` | `<Badge variant={variant} render={<Button ... />}>` |

---

## 2. Fix Checkbox `onCheckedChange` API

Base UI's Checkbox `onCheckedChange` callback receives `(checked: boolean, event)` — NOT the `boolean | "indeterminate"` union from Radix.

### Files to change:

| File | Line | Current | Change to |
|------|------|---------|-----------|
| `components/api-secret-dialog.tsx` | 126 | `onCheckedChange={(checked: boolean \| "indeterminate") => setRememberSecret(checked === true)}` | `onCheckedChange={(checked: boolean) => setRememberSecret(checked)}` |
| `components/tweet-submit-form.tsx` | 290 | `onCheckedChange={(checked: boolean \| "indeterminate") => setRememberSecret(checked === true)}` | `onCheckedChange={(checked: boolean) => setRememberSecret(checked)}` |

---

## 3. Leftover `data-[state=...]` patterns in UI components

These are Radix-style data attribute selectors that base-ui doesn't emit. Base UI uses `data-open`/`data-closed`, `data-checked`/`data-unchecked` etc. (no `data-[state=...]` wrapper).

Most new base-ui components already use the correct patterns. But these files still have old `data-[state=...]` selectors that may not work:

| File | Pattern | Likely fix |
|------|---------|------------|
| `components/ui/tooltip.tsx:53` | `data-[state=delayed-open]:...` | Replace with `data-open:...` (base-ui tooltip) |
| `components/ui/navigation-menu.tsx:145` | `data-[state=visible]:...` / `data-[state=hidden]:...` | Replace with `data-open:...` / `data-closed:...` |
| `components/ui/table.tsx:53` | `data-[state=selected]:bg-muted` | Keep — this is custom app state, not Radix |
| `components/ui/sidebar.tsx:310` | `peer-data-[state=collapsed]:ml-2` | Keep — this is custom app state, not Radix |
| `components/ui/toggle.tsx:9` | `data-[state=on]:...` | Replace with `data-pressed:...` (base-ui toggle) |

---

## 4. Remove old `radix-ui` package dependency

The `radix-ui` meta-package (line 29 of `package.json`) pulls in all the old `@radix-ui/*` packages. Since all components now use `@base-ui/react`, this should be removed.

```bash
pnpm uninstall radix-ui
```

Then verify `pnpm-lock.yaml` no longer references `@radix-ui/*` packages (except any that `cmdk` or other third-party deps may still need transitively).

---

## 5. Build verification

After all changes:

```bash
pnpm build
```

Fix any TypeScript or build errors that surface.

---

## Order of operations

1. Remove `asChild` → replace with `render` prop (§1)
2. Fix `onCheckedChange` signatures (§2)
3. Fix stale `data-[state=...]` selectors (§3)
4. Remove `radix-ui` dependency (§4)
5. Build & verify (§5)
