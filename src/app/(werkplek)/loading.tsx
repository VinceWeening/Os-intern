// Shown in the content area right after a menu click, while the page loads.
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="eyebrow">LADEN…</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-panel" />
    </div>
  );
}
