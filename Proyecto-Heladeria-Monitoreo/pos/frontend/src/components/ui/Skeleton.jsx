export default function Skeleton({
  width = '100%',
  height = '1rem',
  count = 1,
  className = '',
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`skeleton ${className}`.trim()}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
