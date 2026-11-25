# UI ported from Iglesium

The DAM screens in `apps/web` were ported from Iglesium's web app and then changed for
D-cubby (no tenants, VideoTools, Media Catalog or lessons; AssetGrid split into AssetGrid
and AssetDetailModal; shared API client and permissions).

- **Source:** Iglesium `apps/web`, commit `b91eb1b4` (2026-11-24, "pin the dam gem to v0.3.0").
- **Ported:** `components/dashboard/*`, `components/recycle-bin/*`, `components/drop-zones/*`,
  `components/smart-folders/*`, `components/shared/{AssetFilters,ConfirmDialog,Pagination,TagAutocompleteInput,useTagSearch}`,
  `components/ui/{AudioThumbnail,ThumbnailSizeSelector,ThemeToggle}`, the assets, recycle bin,
  smart folders, tags, drop zones, groups and watched folders pages, and the matching
  message namespaces.

## The look has diverged

D-cubby's UI was redesigned after the port (see [design-system.md](design-system.md)). The
ported screens kept their behaviour, but their markup and styling no longer match Iglesium's:
they use D-cubby's design tokens and shared components (`Modal`, `Button`, `Menu`, `Badge`, …)
instead of Iglesium's glass classes and per-screen dialogs. `globals.css` is no longer a copy
of Iglesium's.

## Porting fixes from Iglesium

The backend is shared through the `dam` gem (both apps pin it by tag). The UI is not shared, so:

1. When an Iglesium DAM screen gets a fix or feature, check whether it applies here:
   `git -C <iglesium> log b91eb1b4..master -- apps/web/src/components/dashboard apps/web/src/components/drop-zones apps/web/src/components/smart-folders apps/web/src/components/recycle-bin apps/web/src/components/shared apps/web/messages`
2. Port the **logic** by hand: state, API calls, validation, message keys. Do not copy
   Iglesium's class names or dialog markup; write the markup with D-cubby's components and
   run `npm run lint:tokens`.
3. Update the commit above.
