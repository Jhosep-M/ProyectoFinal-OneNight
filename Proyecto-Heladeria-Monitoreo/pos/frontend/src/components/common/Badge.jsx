const TONES = {
  neutral: 'badge-neutral',
  success: 'badge-success',
  error: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
  accent: 'badge-accent',
};

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${TONES[tone] || TONES.neutral}`.trim()}>{children}</span>;
}
