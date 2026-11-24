'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/config'

export interface TagSuggestion {
  id: number
  name: string
}

type RawTagResponse = {
  id: number
  attributes?: { name: string }
  name?: string
}

export function normalizeTagSearchResults(data: unknown): TagSuggestion[] {
  if (!Array.isArray(data)) return []

  return data
    .map((tag: RawTagResponse): TagSuggestion | null => {
      const tagName = tag.attributes?.name || tag.name || ''
      return tagName ? { id: tag.id, name: tagName } : null
    })
    .filter((tag): tag is TagSuggestion => tag !== null)
}

export function filterExcludedTags(
  suggestions: TagSuggestion[],
  excludeTags: string[]
): TagSuggestion[] {
  const existing = excludeTags.map((tag) => tag.toLowerCase())
  return suggestions.filter((tag) => !existing.includes(tag.name.toLowerCase()))
}

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase()
}

interface UseTagSearchOptions {
  query: string
  excludeTags: string[]
  enabled: boolean
  debounceMs?: number
  limit?: number
}

export function useTagSearch({
  query,
  excludeTags,
  enabled,
  debounceMs = 300,
  limit = 10,
}: UseTagSearchOptions) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setSuggestions([])
      setLoading(false)
      return
    }

    const trimmed = query.trim()
    if (trimmed.length < 1) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.get(API_ENDPOINTS.TAGS.SEARCH, {
          params: { q: trimmed, limit },
        })
        if (cancelled) return

        const tags = normalizeTagSearchResults(response.data.data)
        setSuggestions(filterExcludedTags(tags, excludeTags))
      } catch (error) {
        console.error('Error searching tags:', error)
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [query, excludeTags, enabled, debounceMs, limit])

  return { suggestions, loading }
}
