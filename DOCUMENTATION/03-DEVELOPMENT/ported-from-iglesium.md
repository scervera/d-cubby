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

## Keeping them in sync

The backend is shared through the `dam` gem (both apps pin it by tag). The UI is a copy, so:

1. When an Iglesium DAM screen gets a fix or feature, check whether it applies here:
   `git -C <iglesium> log b91eb1b4..master -- apps/web/src/components/dashboard apps/web/src/components/drop-zones apps/web/src/components/smart-folders apps/web/messages`
2. Port it by hand (paths and imports differ), then update the commit above.
3. If the copies keep drifting, extract the shared screens into an `@scervera/dam-ui` package.
