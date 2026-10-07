export default function SearchBar({ value, onChange }) {
  return (
    <div className="search">
      <label htmlFor="search" className="visually-hidden">Search candidates</label>
      <input id="search" className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search candidates..." autoComplete="off" />
    </div>
  );
}
