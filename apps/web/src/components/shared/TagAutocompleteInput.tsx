'use client'

import React, { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { TagIcon } from '@heroicons/react/24/outline'
import { normalizeTagName, useTagSearch } from '@/components/shared/useTagSearch'

export interface TagAutocompleteInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  label?: string
  hint?: string
  placeholder?: string
  addButtonLabel?: string
}

export default function TagAutocompleteInput({
  tags,
  onTagsChange,
  label,
  hint,
  placeholder,
  addButtonLabel = 'Add',
}: TagAutocompleteInputProps) {
  const tagInputRef = useRef<HTMLInputElement | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tagInputFocused, setTagInputFocused] = useState(false)
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const { suggestions: tagSuggestions } = useTagSearch({
    query: tagInput,
    excludeTags: tags,
    enabled: tagInputFocused,
  })

  const handleAddTag = () => {
    const normalized = normalizeTagName(tagInput)
    if (!normalized) return

    const alreadySelected = tags.some((tag) => tag.toLowerCase() === normalized)
    if (alreadySelected) {
      setTagInput('')
      setShowTagSuggestions(false)
      return
    }

    onTagsChange([...tags, normalized])
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagSuggestionClick = (tagName: string) => {
    setTagInput(tagName)
    setShowTagSuggestions(false)
    setTimeout(() => {
      const input = tagInputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(tagName.length, tagName.length)
    }, 0)
  }

  const visibleSuggestions = showTagSuggestions && tagSuggestions.length > 0

  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          <TagIcon className="mr-1 inline h-4 w-4" />
          {label}
        </label>
      ) : null}
      {hint ? (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}

      <div className="mb-3 flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            ref={tagInputRef}
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value)
              setShowTagSuggestions(true)
            }}
            onFocus={() => {
              setTagInputFocused(true)
              if (tagSuggestions.length > 0) setShowTagSuggestions(true)
            }}
            onBlur={() => {
              setTimeout(() => {
                setTagInputFocused(false)
                setShowTagSuggestions(false)
              }, 200)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              } else if (e.key === 'Escape') {
                setShowTagSuggestions(false)
              } else if (e.key === 'ArrowDown' && visibleSuggestions) {
                e.preventDefault()
                const firstSuggestion = document.querySelector('.tag-suggestion-item') as HTMLElement
                firstSuggestion?.focus()
              }
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder={placeholder}
          />

          {visibleSuggestions ? (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-suggestion-item w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:text-white dark:hover:bg-blue-900/20 dark:focus:bg-blue-900/20"
                  onClick={() => handleTagSuggestionClick(tag.name)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="font-medium">{tag.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAddTag}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          {addButtonLabel}
        </button>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
