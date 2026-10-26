import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// HU-24 — Recuperar contraseña. Mensaje genérico anti-enumeración:
// siempre "Si existe te enviamos el correo", sin revelar si el email existe.
const MENSAJE_GENERICO = 'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
    } catch {
      // Intencional: no revelar si el correo existe o hubo error.
    } finally {
      setInfo(MENSAJE_GENERICO);
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
              Recuperar contraseña
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
              Sistema de Punto de Venta
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              type="email"
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {info && (
              <div className="alert alert-info py-2" role="status" style={{ borderRadius: 0 }}>
                {info}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </form>

          <div className="text-center mt-3">
            <Link to="/login">Volver a ingresar</Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
