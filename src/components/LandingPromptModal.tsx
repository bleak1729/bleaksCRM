import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, ExternalLink, Loader2, LayoutTemplate, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateLandingPrompt } from '../api.js'

interface Lead {
  id: string
  name: string
  sector: string
  [k: string]: unknown
}

interface Props {
  lead: Lead
  onClose: () => void
}

export default function LandingPromptModal({ lead, onClose }: Props) {
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [prompt,   setPrompt]   = useState('')
  const [socials,  setSocials]  = useState<Record<string, string>>({})
  const [copied,   setCopied]   = useState(false)
  const [step,     setStep]     = useState<'loading' | 'ready'| 'done'>('loading')

  useEffect(() => {
    generateLandingPrompt(lead.id)
      .then(({ prompt: p, lead: l }) => {
        setPrompt(p)
        setSocials(l.socials || {})
        setStep('ready')
      })
      .catch(e => setError(e.message || 'Error al generar el prompt'))
      .finally(() => setLoading(false))
  }, [lead.id])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setStep('done')
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const socialCount = Object.values(socials).filter(Boolean).length

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--bor2)',
        borderRadius: 'var(--r3)', width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,.35)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--bor2)', background: 'var(--bg3)', borderRadius: 'var(--r3) var(--r3) 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ac-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
              <LayoutTemplate size={15}/>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)' }}>
                Generar Landing Page
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
                {lead.name} · {lead.sector}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--ac)' }}/>
              <div style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
                Analizando presencia digital de <strong>{lead.name}</strong>…<br/>
                <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Escaneando web y redes sociales</span>
              </div>
            </div>

          ) : error ? (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--fb)' }}>
              {error}
            </div>

          ) : (
            <>
              {/* Info chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Chip icon="🌐" label={lead.sector as string} />
                <Chip icon="📍" label={(lead as any).loc || 'España'} />
                <Chip icon="⭐" label={(lead as any).rating ? `${(lead as any).rating} (${(lead as any).reviews} reseñas)` : 'Sin valoración'} />
                <Chip icon="📱" label={socialCount > 0 ? `${socialCount} redes detectadas` : 'Sin redes detectadas'} />
                <Chip icon="🔧" label={`${((lead as any).flaws || []).length} fallos detectados`} />
              </div>

              {/* Instrucciones */}
              {step !== 'done' && (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--r2)', background: 'var(--ac-tint)', border: '1px solid var(--ac)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--txt)', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} style={{ color: 'var(--ac)' }}/> Cómo usar este prompt
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>Pulsa <strong>Copiar prompt</strong></li>
                    <li>Abre <strong>Claude.ai</strong> y pega el prompt en el chat</li>
                    <li>Claude generará la landing completa como artefacto interactivo</li>
                    <li>Haz ajustes al vuelo y muéstrasela al cliente</li>
                  </ol>
                </div>
              )}

              {step === 'done' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--r2)', background: 'var(--success-bg, #dcfce7)', border: '1px solid var(--success, #15803d)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--success, #15803d)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15}/> Prompt copiado — pégalo en Claude.ai para generar la landing
                </div>
              )}

              {/* Prompt textarea */}
              <div style={{ position: 'relative' }}>
                <textarea
                  readOnly
                  value={prompt}
                  style={{
                    width: '100%', height: 260, padding: '12px 14px',
                    background: 'var(--bg3)', border: '1px solid var(--bor2)',
                    borderRadius: 'var(--r2)', fontSize: 12, fontFamily: 'monospace',
                    color: 'var(--txt2)', resize: 'none', lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
                <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
                  {prompt.length.toLocaleString()} caracteres
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--bor2)', background: 'var(--bg3)', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', borderRadius: '0 0 var(--r3) var(--r3)' }}>
            <Button
              type="button" variant="ghost" shape="square" size="sm"
              onClick={() => window.open('https://claude.ai', '_blank')}
              style={{ fontFamily: 'var(--fd)', fontWeight: 600, fontSize: 13, color: 'var(--txt2)', border: '1px solid var(--bor2)' }}
            >
              <ExternalLink size={13}/> Abrir Claude.ai
            </Button>
            <Button
              type="button" shape="square"
              onClick={handleCopy}
              style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 13, background: copied ? 'var(--success, #15803d)' : 'var(--ac)', color: '#fff', border: 'none', padding: '8px 20px', transition: 'background .2s' }}
            >
              {copied ? <><Check size={14}/> Copiado</> : <><Copy size={14}/> Copiar prompt</>}
            </Button>
          </div>
        )}
      </div>
    </div>,
    window.document.body
  )
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99,
      background: 'var(--bg3)', border: '1px solid var(--bor2)',
      fontSize: 12, fontFamily: 'var(--fb)', color: 'var(--txt2)',
    }}>
      <span>{icon}</span>{label}
    </span>
  )
}
