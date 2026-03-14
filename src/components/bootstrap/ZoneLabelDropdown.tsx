interface ZoneLabelDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  paragraph: 'Body Text',
  'section-header': 'Heading',
  table: 'Table',
  figure: 'Figure / Image',
  caption: 'Caption',
  footnote: 'Footnote',
  header: 'Page Header',
  footer: 'Page Footer',
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
