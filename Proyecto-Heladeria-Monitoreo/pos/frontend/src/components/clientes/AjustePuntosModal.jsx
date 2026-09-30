import { useState } from 'react';
import Card from '../common/Card.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import RequirePermiso from '../common/RequirePermiso.jsx';
import Alert from '../alerts/Alert.jsx';
import { ajustarPuntos } from '../../services/customersService.js';

export default function AjustePuntosModal({ cliente, onClose, onDone }) {
  const [tipo, setTipo] = useState('ajuste');
  const [puntos, setPuntos] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const saldo = Number(cliente?.puntos_fidelidad ?? 0);

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    const motivoLimpio = (motivo ?? '').trim();
    if (motivoLimpio.length < 3) {
      setError('Motivo debe tener al menos 3 caracteres');
      return;
    }
    const num = Number(puntos);
    if (!Number.isFinite(num)) {
      setError('Puntos debe ser un número válido');
      return;
    }
    if (tipo === 'canje') {
      if (!(num > 0)) {
        setError('Para canje los puntos deben ser mayores a 0');
        return;
      }
      if (num > saldo) {
        setError(`Canje supera el saldo disponible (${saldo})`);
        return;
      }
    } else if (num === 0) {
      setError('Ajuste no puede ser 0');
      return;
    }
    const payload = {
      puntos: tipo === 'canje' ? -Math.abs(num) : num,
      tipo,
      motivo: motivoLimpio,
    };
    setSaving(true);
    try {
      await ajustarPuntos(cliente.id_cliente, payload);
      onDone?.();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequirePermiso permiso="cliente.gestionar">
      <Card title={`Ajustar puntos: ${cliente?.nombre}`}>
        {error && <Alert tone="error" message={error} onClose={() => setError(null)} />}
        <form onSubmit={guardar}>
          <Select label="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="ajuste">ajuste</option>
            <option value="canje">canje</option>
          </Select>
          <Input label="Puntos" name="puntos" type="number" value={puntos} onChange={(e) => setPuntos(e.target.value)} />
          <Input label="Motivo" name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" />
          <div className="row-inline">
            <Button type="submit" loading={saving}>Guardar</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </RequirePermiso>
  );
}
