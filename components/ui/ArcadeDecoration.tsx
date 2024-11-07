const ArcadeDecoration = ({ className = "" }) => (
  <div className={`absolute pointer-events-none ${className}`} aria-hidden="true">
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ... bestehende SVG-Inhalte ... */}
    </svg>
  </div>
)

export default ArcadeDecoration