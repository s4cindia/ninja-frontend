/**
 * Structure Tag QC Review — presentational pieces rendered inside
 * PdfPreviewPanel's own overlay layer (see that component's
 * structureTagElements props): one outlined, tag-labeled box per structure
 * element, color-coded by tag family, and a bottom detail strip for the
 * selected element with a dropdown covering the full PDF/UA tag vocabulary.
 *
 * Kept as a separate file from PdfPreviewPanel.tsx to keep this feature's
 * code physically reviewable on its own, even though the positioning math
 * (scale/padding) stays in PdfPreviewPanel itself alongside the existing
 * issue-highlight math it already has, rather than being duplicated here.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { PDF_UA_STRUCTURE_TAGS } from '@/types/pdfStructureTags.types';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

const TAG_FAMILY_COLORS: Record<string, string> = {
  H: '#9333ea', H1: '#9333ea', H2: '#9333ea', H3: '#9333ea', H4: '#9333ea', H5: '#9333ea', H6: '#9333ea',
  P: '#2563eb', Span: '#2563eb', Quote: '#2563eb', BlockQuote: '#2563eb',
  L: '#0d9488', LI: '#0d9488', Lbl: '#0d9488', LBody: '#0d9488',
  Table: '#ea580c', TR: '#ea580c', TH: '#ea580c', TD: '#ea580c', THead: '#ea580c', TBody: '#ea580c', TFoot: '#ea580c',
  Figure: '#16a34a', Formula: '#16a34a', Form: '#16a34a',
  Caption: '#ca8a04', Note: '#ca8a04', Reference: '#ca8a04', BibEntry: '#ca8a04', Code: '#ca8a04',
  Link: '#0891b2', Annot: '#0891b2', TOC: '#0891b2', TOCI: '#0891b2',
  Artifact: '#6b7280', NonStruct: '#6b7280', Private: '#6b7280',
};
const DEFAULT_TAG_COLOR = '#64748b';

function tagFamilyColor(tag: string): string {
  return TAG_FAMILY_COLORS[tag] ?? DEFAULT_TAG_COLOR;
}

export const StructureTagBox: React.FC<{
  element: StructureTagElement;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ element, x, y, width, height, isSelected, onClick }) => {
  const color = tagFamilyColor(element.tag);
  return (
    <div
      className="absolute cursor-pointer transition-all"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: 'transparent',
        border: `2px solid ${color}`,
        outline: isSelected ? '3px solid #fbbf24' : undefined,
        outlineOffset: '2px',
        zIndex: isSelected ? 20 : 10,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${element.tag} element`}
    >
      <span
        className="absolute -top-4 left-0 px-1 text-[10px] font-semibold rounded whitespace-nowrap"
        style={{ backgroundColor: color, color: '#fff' }}
      >
        {element.tag}
      </span>
    </div>
  );
};

export const StructureTagDetailStrip: React.FC<{
  element: StructureTagElement;
  onChange: (newTag: string) => void;
  saving?: boolean;
}> = ({ element, onChange, saving }) => (
  <div className="mt-3 mx-auto max-w-3xl px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-blue-900">Selected: {element.tag}</span>
      <label className="flex items-center gap-1.5">
        <span className="text-blue-700">Change to:</span>
        <select
          value={element.tag}
          disabled={saving}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          aria-label="Change structure tag"
        >
          {PDF_UA_STRUCTURE_TAGS.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </label>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-blue-600" aria-label="Saving" />}
    </div>
    {element.textSnippet && <p className="text-blue-800 mt-1 leading-relaxed">{element.textSnippet}</p>}
  </div>
);
