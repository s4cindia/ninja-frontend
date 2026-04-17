interface ZoneLabelDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  // Content zones
  paragraph: 'P — Body Text',
  h1: 'H1 — Title',
  h2: 'H2 — Section',
  h3: 'H3 — Sub-section',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  'list-item': 'LI — List Item',
  table: 'TBL — Table',
  figure: 'FIG — Figure / Image',
  caption: 'CAP — Caption',
  footnote: 'FN — Footnote',
  formula: 'Formula',
  toci: 'TOCI — Table of Contents Item',
  // Page chrome zones
  header: 'HDR — Page Header',
  footer: 'FTR — Page Footer',
};

export default function ZoneLabelDropdown({ value, onChange, disabled }: ZoneLabelDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Zone type"
      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="" disabled>
        -- Select type --
      </option>
      {Object.entries(ZONE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
