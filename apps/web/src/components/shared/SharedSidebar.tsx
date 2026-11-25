'use client'

import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRightOnRectangleIcon,
  ArrowUturnLeftIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  CpuChipIcon,
  DocumentIcon,
  EyeIcon,
  FolderIcon,
  InboxArrowDownIcon,
  MusicalNoteIcon,
  PhotoIcon,
  ServerStackIcon,
  TagIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/lib/auth/permissions'
import { smartFoldersApi, type SmartFolder } from '@/lib/smartFoldersApi'

export type SidebarPage =
  | 'home'
  | 'assets'
  | 'recycle-bin'
  | 'smart-folders'
  | 'tags'
  | 'drop-zones'
  | 'groups'
  | 'settings'
  | 'account'

interface SharedSidebarProps {
  currentPage?: SidebarPage
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  showAssetCategories?: boolean
}

type Icon = ComponentType<{ className?: string }>
interface NavLink {
  id: string
  label: string
  icon: Icon
  href: string
}

/** Fired by pages that pin or unpin smart folders so the sidebar reloads its list. */
export const SMART_FOLDERS_CHANGED_EVENT = 'smartFoldersChanged'

// The current item is marked with a neutral fill; the accent is kept for actions.
const itemClass = (active: boolean) =>
  `flex h-8 w-full items-center gap-2.5 rounded-control px-2 text-left text-sm transition-colors duration-100 ${
    active ? 'bg-hover font-medium text-fg' : 'text-muted hover:bg-hover hover:text-fg'
  }`
const iconClass = (active: boolean) => `h-4 w-4 shrink-0 ${active ? 'text-fg' : 'text-subtle'}`
const sectionLabelClass = 'mb-1 px-2 text-xs font-medium text-subtle'

export default function SharedSidebar({
  currentPage = 'assets',
  selectedCategory,
  onCategoryChange,
  showAssetCategories = true,
}: SharedSidebarProps) {
  const t = useTranslations('nav')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const [pinnedFolders, setPinnedFolders] = useState<SmartFolder[]>([])

  const loadPinned = useCallback(async () => {
    try {
      setPinnedFolders(await smartFoldersApi.getSidebar())
    } catch {
      setPinnedFolders([])
    }
  }, [])

  useEffect(() => {
    loadPinned()
    window.addEventListener(SMART_FOLDERS_CHANGED_EVENT, loadPinned)
    return () => window.removeEventListener(SMART_FOLDERS_CHANGED_EVENT, loadPinned)
  }, [loadPinned])

  // Without a handler (e.g. first render), fall back to the URL's ?category / ?smart_folder.
  const activeCategory =
    selectedCategory ??
    (searchParams.get('smart_folder')
      ? `smart_folder_${searchParams.get('smart_folder')}`
      : searchParams.get('category') ?? 'all')

  const categories: NavLink[] = [
    { id: 'all', label: t('allAssets'), icon: FolderIcon, href: '/assets' },
    { id: 'image', label: t('images'), icon: PhotoIcon, href: '/assets?category=image' },
    { id: 'video', label: t('videos'), icon: VideoCameraIcon, href: '/assets?category=video' },
    { id: 'audio', label: t('audio'), icon: MusicalNoteIcon, href: '/assets?category=audio' },
    { id: 'document', label: t('documents'), icon: DocumentIcon, href: '/assets?category=document' },
  ]
  const organize: NavLink[] = [
    { id: 'smart-folders', label: t('smartFolders'), icon: CpuChipIcon, href: '/smart-folders' },
    { id: 'tags', label: t('tags'), icon: TagIcon, href: '/tags' },
    { id: 'drop-zones', label: t('dropZones'), icon: InboxArrowDownIcon, href: '/drop-zones' },
    { id: 'groups', label: t('groups'), icon: UserGroupIcon, href: '/groups' },
    { id: 'recycle-bin', label: t('recycleBin'), icon: ArrowUturnLeftIcon, href: '/assets/recycle-bin' },
  ]
  const admin: NavLink[] = [
    { id: 'settings-users', label: t('users'), icon: UsersIcon, href: '/settings/users' },
    { id: 'settings-organization', label: t('organization'), icon: BuildingOfficeIcon, href: '/settings/organization' },
    { id: 'settings-watched-folders', label: t('watchedFolders'), icon: EyeIcon, href: '/settings/watched-folders' },
    { id: 'settings-system', label: t('system'), icon: ServerStackIcon, href: '/settings/system' },
    { id: 'settings-overview', label: t('overview'), icon: ChartPieIcon, href: '/settings' },
  ]

  const onAssetsPage = currentPage === 'assets'
  const isCategoryActive = (id: string) => onAssetsPage && activeCategory === id
  const isPathActive = (href: string) => pathname === href

  const goCategory = (link: NavLink) => {
    if (onAssetsPage && onCategoryChange) onCategoryChange(link.id)
    else router.push(link.href)
  }

  const goSmartFolder = (folder: SmartFolder) => {
    if (onAssetsPage && onCategoryChange) onCategoryChange(`smart_folder_${folder.id}`)
    else router.push(`/assets?smart_folder=${folder.id}`)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const renderLinks = (links: NavLink[], isActive: (link: NavLink) => boolean, onClick: (link: NavLink) => void) => (
    <ul className="space-y-0.5">
      {links.map((link) => {
        const active = isActive(link)
        const LinkIcon = link.icon
        return (
          <li key={link.id}>
            <button type="button" onClick={() => onClick(link)} className={itemClass(active)} aria-current={active ? 'page' : undefined}>
              <LinkIcon className={iconClass(active)} />
              <span className="truncate">{link.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav className="flex min-h-full flex-col gap-5" aria-label={t('mainNavigation')}>
      {showAssetCategories && (
        <section>
          <div className={sectionLabelClass}>{t('library')}</div>
          {renderLinks(categories, (l) => isCategoryActive(l.id), goCategory)}
        </section>
      )}

      {pinnedFolders.length > 0 && (
        <section>
          <div className={sectionLabelClass}>{t('pinnedSmartFolders')}</div>
          <ul className="space-y-0.5">
            {pinnedFolders.map((folder) => {
              const active = isCategoryActive(`smart_folder_${folder.id}`)
              return (
                <li key={folder.id}>
                  <button type="button" onClick={() => goSmartFolder(folder)} className={itemClass(active)} aria-current={active ? 'page' : undefined}>
                    <CpuChipIcon className={iconClass(active)} style={folder.color ? { color: folder.color } : undefined} />
                    <span className="truncate">{folder.name}</span>
                    {folder.asset_count > 0 && (
                      <span className="text-meta ml-auto">{folder.asset_count}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <div className={sectionLabelClass}>{t('organize')}</div>
        {renderLinks(organize, (l) => isPathActive(l.href) || currentPage === l.id, (l) => router.push(l.href))}
      </section>

      {isAdmin(user) && (
        <section>
          <div className={sectionLabelClass}>{t('administration')}</div>
          {renderLinks(admin, (l) => isPathActive(l.href), (l) => router.push(l.href))}
        </section>
      )}

      <section className="mt-auto space-y-0.5 border-t pt-3">
        {user && (
          <>
            <div className="truncate px-2 pb-1 text-xs text-subtle">{user.email}</div>
            <button type="button" onClick={() => router.push('/account')} className={itemClass(pathname === '/account')}>
              <UserCircleIcon className={iconClass(pathname === '/account')} />
              <span>{t('account')}</span>
            </button>
            <button type="button" onClick={handleLogout} className={itemClass(false)}>
              <ArrowRightOnRectangleIcon className={iconClass(false)} />
              <span>{t('logout')}</span>
            </button>
          </>
        )}
      </section>
    </nav>
  )
}
