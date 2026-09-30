export default function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeMap = {
    sm: '32px',
    md: '40px',
    lg: '56px',
  };

  return (
    <div
      className={`rounded-circle bg-primary text-white d-flex align-items-center justify-content-center ${className}`}
      style={{ width: sizeMap[size], height: sizeMap[size], fontSize: size === 'sm' ? '0.75rem' : '1rem' }}
    >
      {initials}
    </div>
  );
}
