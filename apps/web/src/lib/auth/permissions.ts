import type { User } from '@/hooks/useAuth'

export interface OwnedAssetRow {
  user_id?: number | string | null
  purge_after?: string | null
}

/** Owner or admin (the dam gem's admin?). */
export function isAdmin(user: User | null | undefined): boolean {
  return !!user?.permissions.admin
}

/** May upload and organize assets (owner, admin, editor). */
export function canWrite(user: User | null | undefined): boolean {
  return !!user?.permissions.write
}

/** Mirrors the API: admins, or the editor who uploaded the asset. */
export function canRestoreAsset(user: User | null | undefined, asset: OwnedAssetRow): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  if (!canWrite(user)) return false
  return asset.user_id != null && Number(asset.user_id) === user.id
}

/** Permanent purge: admins always; uploaders only after the retention window. */
export function canPurgeAsset(user: User | null | undefined, asset: OwnedAssetRow): boolean {
  if (!canRestoreAsset(user, asset)) return false
  if (isAdmin(user)) return true
  return !!asset.purge_after && new Date(asset.purge_after).getTime() <= Date.now()
}
