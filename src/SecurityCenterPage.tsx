import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import PrivacySettings from './PrivacySettings'
import {
  exportBackup,
  exportEncryptedBackup,
  importEncryptedBackup,
  inspectBackup,
  listRecords,
} from './storage'
import {
  getAutoLockMinutes,
  getDiscreetMode,
  getLastBackupAt,
  getPrivateTags,
  setAutoLockMinutes,
  setDiscreetMode,
  setPrivateTags,
} from './securitySettings'
import { BrandTop, SectionTitle, Tag } from './v2Ui'

function formatDate(value: string | null) {
  if (!value) return 'ainda não criado'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function SecurityCenterPage() {
  const [autoLock, setAutoLock] = useState(() => getAutoLockMinutes())
  const [discreet, setDiscreet] = useState(() => getDiscreetMode())
  const [privateTags, setPrivateTagsState] = useState(() => getPrivateTags().join(', '))
  const [password, setPassword] = useState('')
  const [backupInfo, setBackupInfo] = useState('')
  const [lastBackup, setLastBackup] = useState(() => getLastBackupAt())
  const [recordCount, setRecordCount] = useState(0)

  useEffect(() => {
    void listRecords().then((records) => setRecordCount(records.length))
    const refresh = () => setLastBackup(getLastBackupAt())
    window.addEventListener('eu-security-updated', refresh)
    return () => window.removeEventListener('eu-security-updated', refresh)
  }, [])

  const backupAge = useMemo(() => {
    if (!lastBackup) return null
    return Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
  }, [lastBackup])

  async function createSecureBackup() {
    try {
      await exportEncryptedBackup(password)
      setPassword('')
      setBackupInfo('Backup criptografado criado. A senha não fica salva no EU.')
      setLastBackup(getLastBackupAt())
    } catch (error) {
      setBackupInfo(error instanceof Error ? error.message : 'Não consegui criar o backup seguro.')
    }
  }

  async function inspect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const info = await inspectBackup(file)
      setBackupInfo(`✓ Backup válido · ${info.records} registros · ${info.attachments} anexos · ${info.privateRecords} privados · versão ${info.version}`)
    } catch (error) {
      setBackupInfo(error instanceof Error ? error.message : 'Não consegui validar esse backup.')
    }
  }

  async function restoreEncrypted(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!password) {
      setBackupInfo('Digite a senha do backup antes de restaurar.')
      return
    }
    try {
      await importEncryptedBackup(file, password)
      window.dispatchEvent(new Event('eu-records-restored'))
      setPassword('')
      setBackupInfo('Backup seguro restaurado neste aparelho.')
    } catch (error) {
      setBackupInfo(error instanceof Error ? error.message : 'Não consegui restaurar o backup.')
    }
  }

  function savePrivateTags() {
    const tags = privateTags.split(',').map((tag) => tag.trim()).filter(Boolean)
    setPrivateTags(tags)
    setPrivateTagsState(getPrivateTags().join(', '))
    setBackupInfo('Tags privadas atualizadas. Novos registros com essas tags nascem protegidos.')
  }

  return (
    <div className="v2-page security-center-page">
      <BrandTop />
      <NavLink className="back-v2" to="/memorias">← Memórias</NavLink>

      <header className="v2-hero security-hero">
        <Tag tone="cobalt">CENTRAL DE SEGURANÇA</Tag>
        <h1>Seu arquivo.<br />Suas regras.</h1>
        <p>Proteção local, recuperação e transparência sobre onde seus dados ficam.</p>
      </header>

      <section className="security-status-grid">
        <article>
          <Tag tone="green">LOCAL-FIRST</Tag>
          <strong>{recordCount}</strong>
          <span>registros neste aparelho</span>
        </article>
        <article>
          <Tag tone="cobalt">SEM TRACKERS</Tag>
          <strong>0</strong>
          <span>analytics de terceiros no EU</span>
        </article>
        <article>
          <Tag tone={backupAge !== null && backupAge <= 30 ? 'green' : 'amber'}>BACKUP</Tag>
          <strong>{backupAge === null ? '—' : backupAge + 'd'}</strong>
          <span>desde o último backup</span>
        </article>
      </section>

      <PrivacySettings />

      <section className="security-panel">
        <SectionTitle eyebrow="BLOQUEIO" title="Trancar automaticamente" />
        <p>Quando o EU fica em segundo plano, os privados voltam a pedir PIN depois do intervalo escolhido.</p>
        <div className="security-choice-row">
          {[1, 5, 15, 30].map((minutes) => (
            <button
              key={minutes}
              className={autoLock === minutes ? 'active' : ''}
              onClick={() => {
                setAutoLockMinutes(minutes)
                setAutoLock(minutes)
              }}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </section>

      <section className="security-panel">
        <SectionTitle eyebrow="MODO DISCRETO" title="Abrir o EU perto de alguém" />
        <p>Desfoca textos pessoais na interface sem alterar nenhum dado. Você liga e desliga quando quiser.</p>
        <button
          className={'security-toggle ' + (discreet ? 'active' : '')}
          onClick={() => {
            const next = !discreet
            setDiscreetMode(next)
            setDiscreet(next)
          }}
        >
          <i />
          <span>{discreet ? 'Modo discreto ligado' : 'Modo discreto desligado'}</span>
        </button>
      </section>

      <section className="security-panel">
        <SectionTitle eyebrow="PRIVACIDADE AUTOMÁTICA" title="Tags que sempre nascem privadas" />
        <p>Ex.: relacionamento, saúde, família. Qualquer novo registro com uma dessas tags será marcado como Privado automaticamente.</p>
        <div className="private-tags-editor">
          <input value={privateTags} onChange={(event) => setPrivateTagsState(event.target.value)} placeholder="relacionamento, saúde, família" />
          <button onClick={savePrivateTags}>Salvar tags</button>
        </div>
      </section>

      <section className="security-panel backup-security-panel">
        <SectionTitle eyebrow="RECUPERAÇÃO" title="Backup que você consegue confiar" />
        <p>O backup seguro usa AES-GCM e uma chave derivada da sua senha. A senha não é armazenada no app.</p>

        <div className="secure-backup-password">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="senha do backup (8+ caracteres)"
          />
        </div>

        <div className="security-backup-actions">
          <button onClick={() => void createSecureBackup()} disabled={password.length < 8}>Criar backup criptografado</button>
          <button className="secondary" onClick={() => void exportBackup()}>Criar backup comum</button>
          <label className="secondary">Validar backup<input type="file" accept=".json,application/json" onChange={inspect} /></label>
          <label className="secondary">Restaurar .eubackup<input type="file" accept=".eubackup,application/octet-stream" onChange={restoreEncrypted} /></label>
        </div>

        <div className="backup-security-meta">
          <span>Último backup: {formatDate(lastBackup)}</span>
          {backupInfo && <strong>{backupInfo}</strong>}
        </div>
      </section>

      <NavLink className="trash-entry-card" to="/lixeira">
        <div>
          <Tag tone="wine">LIXEIRA</Tag>
          <strong>Exclusões ficam recuperáveis por 30 dias.</strong>
          <span>Ver itens excluídos e restaurar ↗</span>
        </div>
      </NavLink>
    </div>
  )
}
