'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface FaceDetectionData {
  id: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  confidence?: number;
  person_id: number | null;
  person_name: string | null;
  suggested_matches?: Array<{ person_id: number; person_name: string; confidence: number }>;
}

export interface FaceOverlayProps {
  faces: FaceDetectionData[];
  selectedFaceId: number | null;
  onFaceClick: (face: FaceDetectionData) => void;
  disabled?: boolean;
}

const CURSOR_OFFSET = 12;

export default function FaceOverlay({
  faces,
  selectedFaceId,
  onFaceClick,
  disabled = false
}: FaceOverlayProps) {
  const [hoveredFace, setHoveredFace] = useState<FaceDetectionData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleFaceMouseEnter = useCallback((face: FaceDetectionData, e: React.MouseEvent) => {
    setHoveredFace(face);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleFaceMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleFaceMouseLeave = useCallback(() => {
    setHoveredFace(null);
  }, []);

  const validFaces = faces.filter((f) => f != null && Number.isFinite(f.id));
  if (validFaces.length === 0) return null;

  const displayName = hoveredFace?.person_name?.trim() || (hoveredFace ? 'Unknown' : '');

  return (
    <>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 pointer-events-auto">
          {validFaces.map((face) => {
            const box: Partial<FaceDetectionData['bounding_box']> =
              face.bounding_box && typeof face.bounding_box === 'object' ? face.bounding_box : {};
            const x = (box.x ?? 0) * 100;
            const y = (box.y ?? 0) * 100;
            const w = (box.width ?? 0) * 100;
            const h = (box.height ?? 0) * 100;
            const isSelected = selectedFaceId === face.id;
            return (
              <button
                key={face.id}
                type="button"
                className="absolute rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 hover:border-indigo-400"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  borderColor: isSelected ? 'rgb(99 102 241)' : 'rgba(255,255,255,0.6)',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  pointerEvents: disabled ? 'none' : 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!disabled) onFaceClick(face);
                }}
                onMouseEnter={(e) => handleFaceMouseEnter(face, e)}
                onMouseMove={handleFaceMouseMove}
                onMouseLeave={handleFaceMouseLeave}
                title={face.person_name || 'Unknown face'}
              />
            );
          })}
        </div>
      </div>
      {hoveredFace && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[1000] pointer-events-none px-2 py-1 rounded-md text-xs font-medium text-white bg-slate-900/90 shadow-lg border border-white/20 whitespace-nowrap"
          style={{
            left: tooltipPos.x + CURSOR_OFFSET,
            top: tooltipPos.y + CURSOR_OFFSET
          }}
          role="tooltip"
        >
          {displayName}
        </div>,
        document.body
      )}
    </>
  );
}
