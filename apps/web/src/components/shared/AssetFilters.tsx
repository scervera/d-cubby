'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  lockCategoryTo
}) => {
  const t = useTranslations('assets');
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

    return (
      <div className={`rounded-card ${className}`}>
      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-fg truncate">
              {getContextLabel()}
            </h2>
              <p className="hidden sm:block text-xs sm:text-sm text-subtle">
              {t('filters.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
            {/* View Mode Toggle */}
              <div className="flex items-center rounded-control border border-line bg-surface p-1">
              <button
                onClick={() => handleFilterChange('viewMode', 'grid')}
                  className={`p-1.5 sm:p-2 rounded-control transition-colors ${
                  filters.viewMode === 'grid'
                      ? 'border border-line bg-surface text-fg'
                      : 'text-subtle hover:text-fg'
                }`}
                title={t('filters.gridView')}
              >
                <GridIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => handleFilterChange('viewMode', 'list')}
                  className={`p-1.5 sm:p-2 rounded-control transition-colors ${
                  filters.viewMode === 'list'
                      ? 'border border-line bg-surface text-fg'
                      : 'text-subtle hover:text-fg'
                }`}
                title={t('filters.listView')}
              >
                <ListBulletIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>

            {/* Filters Toggle (hidden when file type is locked — panel would be empty) */}
            {!lockCategoryTo && (
            <button
              onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 sm:p-2 rounded-control border transition-colors ${
                showFilters
                    ? 'border-line bg-accent text-accent-text'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-fg'
              }`}
              title={t('filters.toggleFilters')}
            >
              <FunnelIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3 sm:mb-4 scroll-mt-20">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-subtle" />
          </div>
          <input
            type="text"
            placeholder={t('filters.searchPlaceholder')}
            value={searchInputValue}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onFocus={(e) => {
              // Prevent scroll on focus to avoid layout shifts
              // Only scroll if input is actually cut off by keyboard
              if (window.innerWidth < 768) {
                const rect = e.target.getBoundingClientRect();
                const viewportHeight = window.visualViewport?.height || window.innerHeight;
                const isCutOff = rect.bottom > viewportHeight * 0.8;
                if (isCutOff) {
                  // Use visualViewport if available (accounts for keyboard)
                  if (window.visualViewport) {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
                    }, 150)
                  }
                }
              }
            }}
            onBlur={() => {
              // Sync searchInputValue with filters.search on blur to keep them in sync
              if (searchInputValue !== filters.search) {
                setSearchInputValue(filters.search)
              }
            }}
              className="block w-full rounded-control border border-line bg-surface pl-9 pr-9 py-3.5 text-sm text-fg placeholder:text-subtle"
          />
          {searchInputValue && (
            <button
              onClick={clearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-subtle transition-colors hover:text-muted"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && !lockCategoryTo && (
            <div 
              className="space-y-3 rounded-card border border-line bg-surface p-4"
              onMouseDown={(e) => e.stopPropagation()} // Prevent mouse events from bubbling
              onClick={(e) => e.stopPropagation()} // Prevent clicks inside panel from closing it
            >
            {/* Category Filters */}
            {!lockCategoryTo && (
            <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-subtle">
                {t('filters.fileTypeLabel')}
              </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  { value: 'all', label: t('filters.categories.allFiles'), labelShort: t('filters.categories.allFilesShort'), icon: Squares2X2Icon },
                  { value: 'image', label: t('filters.categories.images'), labelShort: t('filters.categories.imagesShort'), icon: PhotoIcon },
                  { value: 'video', label: t('filters.categories.videos'), labelShort: t('filters.categories.videosShort'), icon: VideoCameraIcon },
                  { value: 'audio', label: t('filters.categories.audio'), labelShort: t('filters.categories.audioShort'), icon: MusicalNoteIcon },
                  { value: 'document', label: t('filters.categories.documents'), labelShort: t('filters.categories.documentsShort'), icon: DocumentIcon },
                ].map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.value}
                      type="button" // Explicitly set button type to prevent form submission
                      onMouseDown={(e) => {
                        e.stopPropagation(); // Prevent mouse events from bubbling
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling that might close the panel
                        e.preventDefault(); // Prevent any default behavior
                        // Ensure panel stays open and trigger filter change
                        setShowFilters(true);
                        handleFilterChange('category', category.value);
                      }}
                        className={`inline-flex items-center gap-2 rounded-control border px-3 py-2 text-xs font-medium transition-all ${
                        filters.category === category.value
                            ? 'border-line bg-surface text-accent-text'
                            : 'border-line bg-surface text-muted hover:border-line-strong hover:bg-hover hover:text-fg'
                      }`}
                    >
                        <IconComponent className="h-4 w-4" />
                        <span className="hidden sm:inline">{category.label}</span>
                        <span className="sm:hidden">{category.labelShort}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default AssetFilters;
