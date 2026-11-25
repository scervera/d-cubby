'use client'

import React, { useId, useRef, useState } from 'react'

import { inputClass, labelClass } from '@/components/forms/fields'
import { normalizeTagName, useTagSearch } from '@/components/shared/useTagSearch'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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
  const inputId = useId()
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
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      ) : null}
      {hint ? (
        <p className="-mt-0.5 mb-2 text-xs text-subtle">{hint}</p>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={inputId}
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
            className={inputClass}
            placeholder={placeholder}
          />

          {visibleSuggestions ? (
            <div className="absolute z-dropdown mt-1 max-h-60 w-full overflow-y-auto rounded-card border bg-raised p-1 shadow-overlay">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-suggestion-item w-full rounded-thumb px-2 py-1.5 text-left text-sm text-fg hover:bg-hover focus:bg-hover"
                  onClick={() => handleTagSuggestionClick(tag.name)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Button variant="secondary" onClick={handleAddTag}>
          {addButtonLabel}
        </Button>
      </div>

      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} tone="accent" onRemove={() => handleRemoveTag(tag)} removeLabel={`Remove tag ${tag}`}>
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
