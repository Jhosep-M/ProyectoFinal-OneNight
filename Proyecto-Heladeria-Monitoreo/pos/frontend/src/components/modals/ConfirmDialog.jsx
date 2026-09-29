import Modal from './Modal.jsx';
import Button from '../common/Button.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirmar', danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
