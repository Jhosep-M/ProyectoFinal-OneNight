import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { iniciarSesion, sesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
<<<<<<< HEAD
=======
  const [verClave, setVerClave] = useState(false);
>>>>>>> origin/feature/Airton-auxilio
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(email, password);
<<<<<<< HEAD
      // al haber sesión, ProtectedRoute redirige solo
=======
>>>>>>> origin/feature/Airton-auxilio
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

<<<<<<< HEAD
  if (sesion) return <Navigate to="/consumo" replace />;

  return (
    <div className="contenido">
      <h1>Iniciar sesión</h1>
      <form className="formulario" onSubmit={enviar}>
=======
  if (sesion) return <Navigate to="/" replace />;

  return (
    <div className="login-pantalla">
      <form className="login-caja" onSubmit={enviar}>
        <h1>Iniciar sesión</h1>
        <p className="subtitulo">Monitoreo de agua y energía</p>
>>>>>>> origin/feature/Airton-auxilio
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Contraseña
<<<<<<< HEAD
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
=======
          <span className="clave-fila">
            <input
              type={verClave ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="ojo"
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verClave ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="entrar" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
>>>>>>> origin/feature/Airton-auxilio
      </form>
    </div>
  );
}
