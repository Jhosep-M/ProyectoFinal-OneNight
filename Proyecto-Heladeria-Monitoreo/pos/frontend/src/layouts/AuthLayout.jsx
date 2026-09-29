export default function AuthLayout({ children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">{children}</div>
    </div>
  );
}
