import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title:     string
  message:   string
  confirmLabel?: string
  onConfirm: () => void
  onCancel:  () => void
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Eliminar', onConfirm, onCancel,
}: Props) {
  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal"
        style={{ maxWidth: 420, width: '100%', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 'var(--r2)', flexShrink: 0,
            background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
          </span>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', marginBottom: 4 }}>
              {title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '20px 24px',
        }}>
          <Button
            variant="ghost"
            shape="square"
            onClick={onCancel}
            style={{ fontFamily: 'var(--fb)', color: 'var(--txt2)' }}
          >
            Cancelar
          </Button>
          <Button
            variant="ghost"
            shape="square"
            onClick={onConfirm}
            style={{
              fontFamily: 'var(--fd)', fontWeight: 700,
              background: 'var(--danger)', color: '#fff',
              border: '1px solid var(--danger)',
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
