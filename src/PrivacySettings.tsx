import { useEffect, useState } from 'react'
import { hasPrivacyPin, isPrivateUnlocked, lockPrivateRecords, removePrivacyPin, setPrivacyPin, unlockPrivateRecords } from './privacy'
import { Tag } from './v2Ui'

export default function PrivacySettings() {
  const [enabled, setEnabled] = useState(() => hasPrivacyPin())
  const [unlocked, setUnlocked] = useState(() => isPrivateUnlocked())
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setEnabled(hasPrivacyPin())
      setUnlocked(isPrivateUnlocked())
    }
    window.addEventListener('eu-privacy-updated', refresh)
    return () => window.removeEventListener('eu-privacy-updated', refresh)
  }, [])

  async function activate() {
    if (pin !== confirm) {
      setMessage('Os PINs não conferem.')
      return
    }

    setBusy(true)
    try {
      await setPrivacyPin(pin)
      setPin('')
      setConfirm('')
      setMessage('PIN criado. Registros privados ficam bloqueados quando você fechar esta sessão.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não consegui criar o PIN.')
    } finally {
      setBusy(false)
    }
  }

  async function unlock() {
    setBusy(true)
    const valid = await unlockPrivateRecords(pin)
    setBusy(false)
    if (!valid) {
      setMessage('PIN incorreto.')
      return
    }
    setPin('')
    setMessage('Privados liberados nesta sessão.')
  }

  function lock() {
    lockPrivateRecords()
    setMessage('Registros privados bloqueados.')
  }

  function remove() {
    if (!window.confirm('Remover o PIN local? Os registros continuam marcados como privados, mas poderão ser abertos sem PIN.')) return
    removePrivacyPin()
    setMessage('PIN removido.')
  }

  return (
    <section className="privacy-settings">
      <Tag tone="pink">PRIVACIDADE</Tag>
      <h2>Seu lado mais privado pode ficar trancado.</h2>
      <p>O PIN é local e protege a abertura dos registros marcados como Privado. Novos PINs usam 6–8 dígitos. Ele é uma trava da interface — não substitui o backup criptografado por senha.</p>

      {!enabled ? (
        <div className="privacy-pin-form">
          <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="crie um PIN" />
          <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ''))} placeholder="repita o PIN" />
          <button onClick={() => void activate()} disabled={busy || pin.length < 6}>Ativar proteção</button>
        </div>
      ) : unlocked ? (
        <div className="privacy-actions">
          <button onClick={lock}>Bloquear agora</button>
          <button className="quiet" onClick={remove}>Remover PIN</button>
        </div>
      ) : (
        <div className="privacy-pin-form">
          <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="seu PIN" />
          <button onClick={() => void unlock()} disabled={busy || pin.length < 4}>Desbloquear privados</button>
        </div>
      )}

      {message && <small>{message}</small>}
    </section>
  )
}
