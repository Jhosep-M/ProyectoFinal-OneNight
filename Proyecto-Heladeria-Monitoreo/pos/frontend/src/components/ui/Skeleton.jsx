export default function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`placeholder-glow ${className}`}
      style={{ width, height }}
    >
      <span className="placeholder w-100 h-100"></span>
    </div>
  );
}
