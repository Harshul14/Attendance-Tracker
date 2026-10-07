import { FILTERS } from '../utils/attendance';

export default function FilterBar({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Filter by status">
      {FILTERS.map((f) => (
        <button key={f.id} type="button" className={`segmented__item ${value === f.id ? 'is-active' : ''}`} aria-pressed={value === f.id} onClick={() => onChange(f.id)}>
          {f.label}
        </button>
      ))}
    </div>
  );
}
