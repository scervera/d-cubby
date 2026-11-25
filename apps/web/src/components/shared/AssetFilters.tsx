'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { inputClass } from '@/components/forms/fields';
import { IconButton } from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  Squares2X2Icon as GridIcon,
  ListBulletIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface FilterContext {
  type: 'all' | 'drop_zone' | 'smart_folder';
  id?: string;
}

export interface AssetFiltersProps {
  context: FilterContext;
  onFiltersChange: (filters: AssetFiltersState) => void;
  className?: string;
  /** Pre-fill search (e.g. when navigating from Tags with ?q=tag1+tag2) */
  initialSearch?: string;
  /** Pre-fill category */
  initialCategory?: string;
  /** When set, file-type category is fixed and the category chip row is hidden (e.g. image-only pickers). */
  lockCategoryTo?: 'image' | 'video' | 'audio' | 'document';
  /** Extra controls at the end of the bar (e.g. thumbnail size). */
  trailing?: React.ReactNode;
}

export interface AssetFiltersState {
  search: string;
  category: string;
  viewMode: 'grid' | 'list';
}

const AssetFilters: React.FC<AssetFiltersProps> = ({ 
  context, 
  onFiltersChange, 
  className = '',
  initialSearch,
  initialCategory,
  lockCategoryTo,
  trailing
}) => {
  const t = useTranslations('assets');
  const tCommon = useTranslations('common');
  const [filters, setFilters] = useState<AssetFiltersState>({
    search: initialSearch ?? '',
    category: lockCategoryTo ?? initialCategory ?? 'all',
    viewMode: 'grid'
  });

  // Separate state for search input to allow immediate UI updates
  const [searchInputValue, setSearchInputValue] = useState(initialSearch ?? '');
  const hasAppliedInitialRef = useRef(false);

  const [showFilters, setShowFilters] = useState(false);
  const isInitialMount = useRef(true);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const lastFiltersRef = useRef<AssetFiltersState | null>(null);

  // Keep the callback ref up to date
  onFiltersChangeRef.current = onFiltersChange;

  // When parent passes initialSearch/initialCategory (e.g. from URL after navigating from Tags), apply once
  useEffect(() => {
    if (hasAppliedInitialRef.current) return
    const search = (initialSearch ?? '').trim()
    const category = (initialCategory ?? 'all').trim()
    if (search !== '' || category !== 'all') {
      hasAppliedInitialRef.current = true
      setSearchInputValue(search)
      setFilters((prev) => ({ ...prev, search, category }))
      // Prevent the filters-change effect from firing and clearing tag context in Dashboard
      lastFiltersRef.current = { search, category, viewMode: 'grid' }
    }
  }, [initialSearch, initialCategory])

  // Only call onFiltersChange when filters actually change, not on initial mount
  // This prevents duplicate API calls since Dashboard already fetches initial data
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastFiltersRef.current = filters;
      return; // Skip the initial call
    }
    
    // Only call if filters actually changed (deep comparison)
    if (lastFiltersRef.current && 
        lastFiltersRef.current.search === filters.search &&
        lastFiltersRef.current.category === filters.category &&
        lastFiltersRef.current.viewMode === filters.viewMode) {
      return; // No actual change, skip callback
    }
    
    lastFiltersRef.current = filters;
    onFiltersChangeRef.current(filters);
  }, [filters]); // Remove onFiltersChange from dependencies to prevent loops

  // Debounce search input to prevent excessive API calls
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (lockCategoryTo) {
      setFilters((prev) => (prev.category === lockCategoryTo ? prev : { ...prev, category: lockCategoryTo }))
    }
  }, [lockCategoryTo])

  const handleFilterChange = (key: keyof AssetFiltersState, value: string) => {
    if (key === 'category' && lockCategoryTo) {
      return
    }
    if (key === 'search') {
      // Update input value immediately for responsive UI
      setSearchInputValue(value);
      
      // If search is cleared (empty), update immediately to reload all assets
      if (value === '') {
        // Clear any pending debounce
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
        // Update filters immediately to trigger reload
        setFilters(prev => ({ ...prev, [key]: value }));
      } else {
        // Debounce the actual filter state update to prevent excessive API calls
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
          setFilters(prev => ({ ...prev, [key]: value }));
        }, 300); // 300ms debounce
      }
    } else {
      // For category changes, ensure filter panel stays open
      if (key === 'category') {
        setShowFilters(true); // Keep panel open when category changes
      }
      // Immediate update for non-search filters
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const clearSearch = () => {
    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchInputValue('');
    setFilters(prev => ({ ...prev, search: '' }));
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Sync searchInputValue with filters.search when it changes (after debounce)
  // Only sync if filters.search was updated externally (not from user typing)
  useEffect(() => {
    // Only sync if the debounced value differs and user isn't actively typing
    if (filters.search !== searchInputValue && !searchTimeoutRef.current) {
      setSearchInputValue(filters.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Prevent layout shifts when keyboard appears on mobile
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const handleViewportResize = () => {
      // Use visualViewport to prevent layout shifts when keyboard appears
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        // Only adjust if keyboard is significantly visible (more than 150px difference)
        const heightDiff = window.innerHeight - viewport.height;
        
        if (heightDiff > 150) {
          // Keyboard is visible - ensure content doesn't expand beyond viewport
          const mainElement = document.querySelector('main');
          if (mainElement) {
            (mainElement as HTMLElement).style.maxHeight = `${viewport.height}px`;
          }
        } else {
          // Keyboard is hidden - restore normal height
          const mainElement = document.querySelector('main');
          if (mainElement) {
            (mainElement as HTMLElement).style.maxHeight = '';
          }
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportResize);
        const mainElement = document.querySelector('main');
        if (mainElement) {
          (mainElement as HTMLElement).style.maxHeight = '';
        }
      };
    }
  }, []);

  const getContextLabel = () => {
    switch (context.type) {
      case 'all':
        return t('filters.context.all');
      case 'drop_zone':
        return t('filters.context.dropZone', { id: context.id || '' });
      case 'smart_folder':
        return t('filters.context.smartFolder', { id: context.id || '' });
      default:
        return '';
    }
  };

  const categories = [
    { value: 'all', label: t('filters.categories.allFiles'), labelShort: t('filters.categories.allFilesShort'), icon: Squares2X2Icon },
    { value: 'image', label: t('filters.categories.images'), labelShort: t('filters.categories.imagesShort'), icon: PhotoIcon },
    { value: 'video', label: t('filters.categories.videos'), labelShort: t('filters.categories.videosShort'), icon: VideoCameraIcon },
    { value: 'audio', label: t('filters.categories.audio'), labelShort: t('filters.categories.audioShort'), icon: MusicalNoteIcon },
    { value: 'document', label: t('filters.categories.documents'), labelShort: t('filters.categories.documentsShort'), icon: DocumentIcon },
  ];

  return (
    <div className={className} role="search" aria-label={getContextLabel()}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56 scroll-mt-20">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            placeholder={t('filters.searchPlaceholder')}
            aria-label={t('filters.searchPlaceholder')}
            value={searchInputValue}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onBlur={() => {
              // Sync searchInputValue with filters.search on blur to keep them in sync
              if (searchInputValue !== filters.search) {
                setSearchInputValue(filters.search)
              }
            }}
            className={`${inputClass} h-9 py-0 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden`}
          />
          {searchInputValue && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={tCommon('close')}
              className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-thumb text-subtle hover:bg-hover hover:text-fg"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Hidden when the file type is locked: the panel would be empty. */}
        {!lockCategoryTo && (
          <IconButton
            variant={showFilters || filters.category !== 'all' ? 'secondary' : 'ghost'}
            aria-label={t('filters.toggleFilters')}
            aria-expanded={showFilters}
            title={t('filters.toggleFilters')}
            onClick={() => setShowFilters(!showFilters)}
            className={filters.category !== 'all' ? 'text-accent-text' : ''}
          >
            <FunnelIcon className="h-4 w-4" aria-hidden />
          </IconButton>
        )}

        <SegmentedControl
          label={t('filters.gridView')}
          value={filters.viewMode}
          onChange={(mode) => handleFilterChange('viewMode', mode)}
          segments={[
            { value: 'grid', icon: <GridIcon aria-hidden />, title: t('filters.gridView') },
            { value: 'list', icon: <ListBulletIcon aria-hidden />, title: t('filters.listView') },
          ]}
        />

        {trailing}
      </div>

      {showFilters && !lockCategoryTo && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('filters.fileTypeLabel')}>
          <span className="mr-1 text-xs text-subtle">{t('filters.fileTypeLabel')}</span>
          {categories.map((category) => {
            const IconComponent = category.icon;
            const active = filters.category === category.value;
            return (
              <button
                key={category.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleFilterChange('category', category.value)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-colors duration-100 ${
                  active ? 'bg-accent-subtle text-accent-text' : 'text-muted hover:bg-hover hover:text-fg'
                }`}
              >
                <IconComponent className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{category.label}</span>
                <span className="sm:hidden">{category.labelShort}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssetFilters;
