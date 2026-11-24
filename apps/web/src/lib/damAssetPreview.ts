export function getDamAssetPreviewUrl(res: { data?: unknown }): string | null {
  const root = res.data as Record<string, unknown> | undefined
  const data = root?.data as Record<string, unknown> | undefined
  const attrs = (data?.attributes ?? root?.attributes) as Record<string, unknown> | undefined
  const url =
    (attrs?.file_url as string | undefined) ??
    (attrs?.preview_url as string | undefined) ??
    (attrs?.thumbnail_url as string | undefined) ??
    (data?.file_url as string | undefined) ??
    (root?.file_url as string | undefined)

  return typeof url === 'string' && url.length > 0 ? url : null
}

export async function fetchDamAssetPreviewUrl(
  assetId: string | number | null | undefined,
  fetchAsset: (id: string) => Promise<{ data?: unknown }>
): Promise<string | null> {
  if (assetId === null || assetId === undefined || assetId === '') return null

  try {
    const res = await fetchAsset(String(assetId))
    return getDamAssetPreviewUrl(res)
  } catch {
    return null
  }
}
