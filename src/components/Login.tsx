import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { getAuthStatus, login, setupAccount, saveToken } from '../api.js'

interface Props {
  onSuccess: (username: string) => void
}

export default function Login({ onSuccess }: Props) {
  const [isSetup,   setIsSetup]   = useState<boolean | null>(null)  // null = cargando
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAuthStatus()
      .then(d => { setIsSetup(!d.hasUsers); setTimeout(() => inputRef.current?.focus(), 100) })
      .catch(() => setIsSetup(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isSetup && password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const fn = isSetup ? setupAccount : login
      const { token, username: user } = await fn(username, password)
      saveToken(token)
      onSuccess(user)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--bg2)', border: '1px solid var(--bor2)',
        borderRadius: 'var(--r3)', boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        {/* Header con logo */}
        <div style={{
          background: 'var(--ac)', padding: '32px 32px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <img
            src="/logo.png"
            alt="Bleak's Solutions CRM"
            style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 16, background: 'rgba(255,255,255,.15)', padding: 8 }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', letterSpacing: '-.02em', margin: 0 }}>
              Bleak's Solutions
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: '2px 0 0', fontFamily: 'var(--fb)' }}>CRM</p>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ padding: '28px 32px 32px' }}>
          {isSetup === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ac)' }} />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--fd)', margin: '0 0 4px' }}>
                  {isSetup ? 'Crear cuenta de administrador' : 'Iniciar sesión'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--txt2)', fontFamily: 'var(--fb)', margin: 0 }}>
                  {isSetup
                    ? 'Primera vez — configura tus credenciales de acceso'
                    : 'Introduce tus credenciales para continuar'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Usuario */}
                <div>
                  <Label htmlFor="login-user" style={{ marginBottom: 6, display: 'block' }}>
                    Usuario
                  </Label>
                  <Input
                    id="login-user"
                    ref={inputRef}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="tu_usuario"
                    autoComplete="username"
                    required
                    style={{ fontFamily: 'var(--fb)' }}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <Label htmlFor="login-pass" style={{ marginBottom: 6, display: 'block' }}>
                    Contraseña
                  </Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="login-pass"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={isSetup ? 'new-password' : 'current-password'}
                      required
                      style={{ fontFamily: 'var(--fb)', paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña (solo en setup) */}
                {isSetup && (
                  <div>
                    <Label htmlFor="login-confirm" style={{ marginBottom: 6, display: 'block' }}>
                      Confirmar contraseña
                    </Label>
                    <Input
                      id="login-confirm"
                      type={showPass ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      style={{ fontFamily: 'var(--fb)' }}
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 'var(--r2)',
                    background: 'var(--danger-bg)', color: 'var(--danger)',
                    fontSize: 13, fontFamily: 'var(--fb)',
                  }}>
                    {error}
                  </div>
                )}

                {/* Botón */}
                <Button
                  type="submit"
                  shape="square"
                  disabled={loading}
                  className="w-full mt-1"
                  style={{ fontFamily: 'var(--fd)', fontWeight: 700, background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)', height: 42 }}
                >
                  {loading
                    ? <Loader2 size={16} className="animate-spin"/>
                    : isSetup
                      ? <><UserPlus size={15}/> Crear cuenta</>
                      : <><LogIn size={15}/> Entrar</>
                  }
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
