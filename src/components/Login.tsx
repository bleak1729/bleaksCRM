import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, LogIn, UserPlus, Loader2, KeyRound, Copy, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { getAuthStatus, login, setupAccount, saveToken, recoverPassword } from '../api.js'

type Mode = 'login' | 'recover'

interface Props {
  onSuccess: (username: string) => void
}

export default function Login({ onSuccess }: Props) {
  const [isSetup,      setIsSetup]      = useState<boolean | null>(null)
  const [mode,         setMode]         = useState<Mode>('login')
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [recoveryKey,  setRecoveryKey]  = useState('')
  const [newPassword,  setNewPassword]  = useState('')
  const [newConfirm,   setNewConfirm]   = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [recoverOk,    setRecoverOk]    = useState(false)
  // Modal que muestra la clave de recuperación tras el setup
  const [setupKey,     setSetupKey]     = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAuthStatus()
      .then(d => { setIsSetup(!d.hasUsers); setTimeout(() => inputRef.current?.focus(), 100) })
      .catch(() => setIsSetup(false))
  }, [])

  const handleCopyKey = () => {
    if (!setupKey) return
    navigator.clipboard.writeText(setupKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'recover') {
      if (newPassword !== newConfirm) { setError('Las contraseñas no coinciden'); return }
      if (newPassword.length < 6)     { setError('La contraseña debe tener al menos 6 caracteres'); return }
      setLoading(true)
      try {
        await recoverPassword(username, recoveryKey, newPassword)
        setRecoverOk(true)
      } catch (err: any) {
        setError(err.message || 'Error al recuperar contraseña')
      } finally { setLoading(false) }
      return
    }

    if (isSetup && password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      if (isSetup) {
        const { token, username: user, recoveryKey: rk } = await setupAccount(username, password)
        saveToken(token)
        setSetupKey(rk)
        // onSuccess se llama cuando el usuario cierra el modal de la clave
        return
      }
      const { token, username: user } = await login(username, password)
      saveToken(token)
      onSuccess(user)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  /* ── Estilos compartidos ─────────────────────────────────── */
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 400,
    background: 'var(--bg2)', border: '1px solid var(--bor2)',
    borderRadius: 'var(--r3)', boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  }
  const header: React.CSSProperties = {
    background: 'var(--ac)', padding: '32px 32px 28px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  }

  const pwField = (id: string, val: string, set: (v: string) => void, label: string, auto: string) => (
    <div>
      <Label htmlFor={id} style={{ marginBottom: 6, display: 'block' }}>{label}</Label>
      <div style={{ position: 'relative' }}>
        <Input
          id={id}
          type={showPass ? 'text' : 'password'}
          value={val}
          onChange={e => set(e.target.value)}
          placeholder="••••••••"
          autoComplete={auto}
          required
          style={{ fontFamily: 'var(--fb)', paddingRight: 40 }}
        />
        <button type="button" onClick={() => setShowPass(v => !v)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', display: 'flex' }}>
          {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
        </button>
      </div>
    </div>
  )

  /* ── Modal: clave de recuperación mostrada tras setup ─── */
  if (setupKey) {
    const pendingUsername = username
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ ...card, maxWidth: 440 }}>
          <div style={{ ...header, background: 'var(--success, #15803d)' }}>
            <ShieldCheck size={40} color="#fff" strokeWidth={1.5}/>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', margin: 0 }}>Cuenta creada</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', margin: '4px 0 0', fontFamily: 'var(--fb)' }}>Guarda tu clave de recuperación</p>
            </div>
          </div>
          <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.6 }}>
              Esta clave te permitirá recuperar el acceso si olvidas tu contraseña.<br/>
              <strong style={{ color: 'var(--danger)' }}>Solo se muestra una vez.</strong> Cópiala y guárdala en un lugar seguro.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg3)', border: '1px solid var(--bor2)',
              borderRadius: 'var(--r2)', padding: '12px 14px',
            }}>
              <KeyRound size={16} style={{ color: 'var(--ac)', flexShrink: 0 }}/>
              <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '.15em', color: 'var(--txt)', flex: 1 }}>
                {setupKey}
              </span>
              <button
                type="button"
                onClick={handleCopyKey}
                title="Copiar clave"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--success, #15803d)' : 'var(--txt3)', display: 'flex', padding: 4, borderRadius: 4 }}
              >
                {copied ? <Check size={16}/> : <Copy size={16}/>}
              </button>
            </div>
            <Button
              type="button"
              shape="square"
              onClick={() => { setSetupKey(null); onSuccess(pendingUsername) }}
              className="w-full"
              style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', height: 42 }}
            >
              He guardado la clave — Continuar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <img src="/logo.png" alt="Bleak's Solutions CRM"
            style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 16, background: 'rgba(255,255,255,.15)', padding: 8 }}/>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', letterSpacing: '-.02em', margin: 0 }}>Bleak's Solutions</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: '2px 0 0', fontFamily: 'var(--fb)' }}>CRM</p>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ padding: '28px 32px 32px' }}>
          {isSetup === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ac)' }}/>
            </div>

          ) : mode === 'recover' ? (
            /* ── Modo recuperación ───────────────────────── */
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', margin: '0 0 4px' }}>
                  Recuperar contraseña
                </h2>
                <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', margin: 0 }}>
                  Introduce tu clave de recuperación para establecer una nueva contraseña.
                </p>
              </div>

              {recoverOk ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--success-bg, #dcfce7)', color: 'var(--success, #15803d)', fontSize: 13, fontFamily: 'var(--fb)' }}>
                    Contraseña actualizada correctamente. Ya puedes iniciar sesión.
                  </div>
                  <Button type="button" shape="square" onClick={() => { setMode('login'); setRecoverOk(false); setError('') }}
                    className="w-full" style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', height: 42 }}>
                    <LogIn size={15}/> Ir al login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <Label htmlFor="rec-user" style={{ marginBottom: 6, display: 'block' }}>Usuario</Label>
                    <Input id="rec-user" ref={inputRef} value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="tu_usuario" autoComplete="username" required style={{ fontFamily: 'var(--fb)' }}/>
                  </div>
                  <div>
                    <Label htmlFor="rec-key" style={{ marginBottom: 6, display: 'block' }}>
                      <KeyRound size={11} className="inline mr-1"/>Clave de recuperación
                    </Label>
                    <Input id="rec-key" value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX-XXXX" required style={{ fontFamily: 'monospace', letterSpacing: '.1em' }}/>
                  </div>
                  {pwField('rec-pass',    newPassword, setNewPassword, 'Nueva contraseña',     'new-password')}
                  {pwField('rec-confirm', newConfirm,  setNewConfirm,  'Confirmar contraseña', 'new-password')}
                  {error && (
                    <div style={{ padding: '10px 12px', borderRadius: 'var(--r2)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--fb)' }}>
                      {error}
                    </div>
                  )}
                  <Button type="submit" shape="square" disabled={loading} className="w-full mt-1"
                    style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', height: 42 }}>
                    {loading ? <Loader2 size={16} className="animate-spin"/> : <><KeyRound size={15}/> Cambiar contraseña</>}
                  </Button>
                  <button type="button" onClick={() => { setMode('login'); setError('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--txt3)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
                    ← Volver al login
                  </button>
                </form>
              )}
            </>

          ) : (
            /* ── Modo login / setup ──────────────────────── */
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', margin: '0 0 4px' }}>
                  {isSetup ? 'Crear cuenta de administrador' : 'Iniciar sesión'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', margin: 0 }}>
                  {isSetup ? 'Primera vez — configura tus credenciales de acceso' : 'Introduce tus credenciales para continuar'}
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Label htmlFor="login-user" style={{ marginBottom: 6, display: 'block' }}>Usuario</Label>
                  <Input id="login-user" ref={inputRef} value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="tu_usuario" autoComplete="username" required style={{ fontFamily: 'var(--fb)' }}/>
                </div>
                {pwField('login-pass', password, setPassword, 'Contraseña', isSetup ? 'new-password' : 'current-password')}
                {isSetup && pwField('login-confirm', confirm, setConfirm, 'Confirmar contraseña', 'new-password')}
                {error && (
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--r2)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--fb)' }}>
                    {error}
                  </div>
                )}
                <Button type="submit" shape="square" disabled={loading} className="w-full mt-1"
                  style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', height: 42 }}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin"/>
                    : isSetup
                      ? <><UserPlus size={15}/> Crear cuenta</>
                      : <><LogIn size={15}/> Entrar</>
                  }
                </Button>
                {!isSetup && (
                  <button type="button" onClick={() => { setMode('recover'); setError('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--txt3)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
