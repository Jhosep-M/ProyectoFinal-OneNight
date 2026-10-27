import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Cambio de contraseña con código de verificación (self-service).
// Mensajes genéricos anti-enumeración: no revelar si el email existe.
const MENSAJE_CODIGO = 'Si existe una cuenta con ese correo, te enviamos un código de verificación.';

export default function RecuperarPage() {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { solicitarCodigo, verificarCodigo, actualizarPassword } = useAuth();
  const navigate = useNavigate();

  const pedirCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await solicitarCodigo(email);
    } catch {
      // Intencional: no revelar si el correo existe o hubo error.
    } finally {
      setInfo(MENSAJE_CODIGO);
      setPaso(2);
      setLoading(false);
    }
  };

  const validarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    // Supabase emite códigos de 6 a 8 dígitos según configuración; no anclar longitud.
    if (!/^\d{6,8}$/.test(codigo)) {
      setError('Ingresa el código completo que llegó a tu correo (6 a 8 dígitos).');
      return;
    }
    setLoading(true);
    try {
      await verificarCodigo(email, codigo);
      setInfo('Código verificado. Elige tu nueva contraseña.');
      setPaso(3);
    } catch {
      setError('Código inválido o vencido. Revisa tu correo e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const guardarNueva = async (e) => {
    e.preventDefault();
    setError('');
    if (nueva.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await actualizarPassword(nueva);
      setInfo('Contraseña actualizada. Ya puedes ingresar.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="auth-card" hover={false}>
          <div className="text-center mb-4">
            <h1 style={{ fontFamily: 'var(--bs-font-serif)', fontStyle: 'italic' }}>
              Cambiar contraseña
            </h1>
            <div
              className="text-muted mb-0"
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--bs-font-sans-serif)',
              }}
            >
              Sistema de Punto de Venta · paso {paso} de 3
            </div>
          </div>

          {paso === 1 && (
            <form onSubmit={pedirCodigo}>
              <Input
                type="email"
                label="Email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar código'}
              </Button>
            </form>
          )}

          {paso === 2 && (
            <form onSubmit={validarCodigo}>
              <Input
                label="Código de verificación"
                placeholder="Código del correo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                minLength={6}
                maxLength={8}
              />
              <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
                {loading ? 'Verificando...' : 'Verificar código'}
              </Button>
              <div className="text-center mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={pedirCodigo} disabled={loading}>
                  Reenviar código
                </Button>
              </div>
            </form>
          )}

          {paso === 3 && (
            <form onSubmit={guardarNueva}>
              <Input
                type="password"
                label="Nueva contraseña"
                placeholder="mínimo 8 caracteres"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                minLength={8}
              />
              <Input
                type="password"
                label="Confirmar contraseña"
                placeholder="repite la contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={8}
              />
              <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </Button>
            </form>
          )}

          {info && (
            <div className="alert alert-info py-2 mt-3" role="status" style={{ borderRadius: 0 }}>
              {info}
            </div>
          )}
          {error && (
            <div className="alert alert-danger py-2 mt-3" role="alert" style={{ borderRadius: 0 }}>
              {error}
            </div>
          )}

          <div className="text-center mt-3">
            <Link to="/login">Volver a ingresar</Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
