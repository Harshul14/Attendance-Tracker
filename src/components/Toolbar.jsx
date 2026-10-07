import SearchBar from './SearchBar';
import FilterBar from './FilterBar';

export default function Toolbar({ query, onQuery, filter, onFilter, tabs, tab, onTab, canUndo, onUndo, onNewUpload, onExport, onReset, onMarkVisible, visibleCount }) {
  return (
    <section className="toolbar" aria-label="Controls">
      <div className="toolbar__row">
        <div className="segmented" role="tablist" aria-label="Section">
          {tabs.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`segmented__item ${tab === t ? 'is-active' : ''}`} onClick={() => onTab(t)}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <SearchBar value={query} onChange={onQuery} />
      </div>
      <div className="toolbar__row">
        <FilterBar value={filter} onChange={onFilter} />
        <div className="toolbar__actions">
          <button type="button" className="btn" onClick={onUndo} disabled={!canUndo}>Undo</button>
          <button type="button" className="btn" onClick={() => onMarkVisible('present')} disabled={!visibleCount}>All visible Present</button>
          <button type="button" className="btn" onClick={() => onMarkVisible('absent')} disabled={!visibleCount}>All visible Absent</button>
          <button type="button" className="btn btn--primary" onClick={onExport}>Export Attendance</button>
          <button type="button" className="btn" onClick={onNewUpload}>Upload New Excel</button>
          <button type="button" className="btn btn--danger" onClick={onReset}>Reset Attendance</button>
        </div>
      </div>
    </section>
  );
}
