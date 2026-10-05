import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { moneySupabase, signInMoney } from './folegoNative'
import { EuIcon, Tag } from './v2Ui'

export default function CentralAuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let active = true

    void moneySupabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSignedIn(Boolean(data.session))
      setReady(true)
    })

    const { data } = moneySupabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSignedIn(Boolean(session))
      setReady(true)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <main className="central-auth-shell">
        <div className="central-auth-loading" aria-live="polite">
          <span />
          <p>Abrindo seu EU…</p>
        </div>
      </main>
    )
  }

  if (!signedIn) return <CentralLogin />
  return <>{children}</>
}

function CentralLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || password.length < 6) return

    setBusy(true)
    setError('')
    try {
      await signInMoney(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="central-auth-shell">
      <section className="central-auth-card">
        <div className="central-auth-brand">
          <span>EU</span>
          <Tag tone="cobalt">CENTRAL PESSOAL</Tag>
        </div>

        <h1>Sua vida.<br />Um login.</h1>
        <p>Use a mesma conta e a mesma senha que você já usava no FÔLEGO. Agora ela protege toda a sua central EU.</p>

        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="central-auth-error" role="alert">
              <EuIcon name="help" />
              <span>{error}</span>
            </div>
          )}

          <button disabled={busy || !email.trim() || password.length < 6}>
            {busy ? 'Entrando…' : 'Entrar no EU'}
          </button>
        </form>

        <div className="central-auth-trust">
          <EuIcon name="shield" />
          <p><strong>É a mesma conta.</strong> Não criamos outro usuário. A autenticação continua no mesmo backend financeiro que você já usava.</p>
        </div>
      </section>
    </main>
  )
}
