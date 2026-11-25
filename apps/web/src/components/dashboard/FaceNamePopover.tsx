'use client';

import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import type { FaceDetectionData } from './FaceOverlay';

export interface FacePersonOption {
  id: number;
  name: string;
  face_count?: number;
}

export interface FaceNamePopoverProps {
  face: FaceDetectionData;
  suggestedMatches: Array<{ person_id: number; person_name: string; confidence: number }>;
  existingPeople: FacePersonOption[];
  onSave: (personId: number) => Promise<void>;
  onCreateAndSave: (name: string) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function FaceNamePopover({
  face,
  suggestedMatches,
  existingPeople,
  onSave,
  onCreateAndSave,
  onClose,
  loading = false
}: FaceNamePopoverProps) {
  const [inputValue, setInputValue] = useState(face.person_name || '');
  const [saving, setSaving] = useState(false);
  const [createNew, setCreateNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredPeople = existingPeople.filter(
    (p) => p.name.toLowerCase().includes(inputValue.trim().toLowerCase())
  );
  const showSuggestions = inputValue.trim().length > 0 && (filteredPeople.length > 0 || createNew);

  const handleSaveExisting = async (personId: number) => {
    setSaving(true);
    try {
      await onSave(personId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndSave = async () => {
    const name = inputValue.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onCreateAndSave(name);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="absolute z-modal min-w-[240px] rounded-control border border-line bg-scrim p-3"
      role="dialog"
      aria-label="Identify face"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="text-sm font-medium text-subtle">
          {face.person_name ? 'Change name' : 'Who is this?'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-subtle hover:bg-hover hover:text-subtle"
          aria-label="Close"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setCreateNew(e.target.value.trim().length > 0 && filteredPeople.length === 0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Enter name or select below"
          className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-subtle placeholder:text-subtle"
          disabled={loading || saving}
        />

        {suggestedMatches.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-subtle">Suggested</p>
            <div ref={listRef} className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
              {suggestedMatches.map((m) => (
                <button
                  key={m.person_id}
                  type="button"
                  onClick={() => handleSaveExisting(m.person_id)}
                  disabled={saving}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-subtle hover:bg-hover disabled:opacity-50"
                >
                  <span>{m.person_name}</span>
                  <span className="text-xs text-subtle">
                    {Math.round(m.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showSuggestions && (
          <div className="mt-2">
            <p className="text-xs font-medium text-subtle">Existing people</p>
            <div className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
              {filteredPeople.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSaveExisting(p.id)}
                  disabled={saving}
                  className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-subtle hover:bg-hover disabled:opacity-50"
                >
                  {p.name}
                </button>
              ))}
              {filteredPeople.length === 0 && inputValue.trim() && (
                <button
                  type="button"
                  onClick={handleCreateAndSave}
                  disabled={saving}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent-text hover:bg-hover disabled:opacity-50"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  Create &quot;{inputValue.trim()}&quot;
                </button>
              )}
            </div>
          </div>
        )}

        {!showSuggestions && inputValue.trim() && (
          <button
            type="button"
            onClick={handleCreateAndSave}
            disabled={saving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-control bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
          >
            <UserPlusIcon className="h-4 w-4" />
            {saving ? 'Saving…' : 'Create and tag'}
          </button>
        )}
      </div>
    </div>
  );
}
