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
import { useBridges, useRecords } from './appState'
import { localSyncVaultMeta, syncVaultSecurityNote, writeLocalSyncVault } from './syncVault'
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type EuNotificationCategory,
} from './notifications'

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
  const records = useRecords()
  const { bridges } = useBridges()
  const [autoLock, setAutoLock] = useState(() => getAutoLockMinutes())
  const [discreet, setDiscreet] = useState(() => getDiscreetMode())
  const [privateTags, setPrivateTagsState] = useState(() => getPrivateTags().join(', '))
  const [password, setPassword] = useState('')
  const [backupInfo, setBackupInfo] = useState('')
  const [lastBackup, setLastBackup] = useState(() => getLastBackupAt())
  const [recordCount, setRecordCount] = useState(0)
  const [vaultUpdatedAt, setVaultUpdatedAt] = useState(() => localSyncVaultMeta().updatedAt)
  const [notificationPrefs, setNotificationPrefs] = useState(() => getNotificationPreferences())

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

  async function refreshVault() {
    try {
      const updatedAt = await writeLocalSyncVault(records, bridges)
      setVaultUpdatedAt(updatedAt)
      setBackupInfo('Sync Vault local atualizado.')
    } catch {
      setBackupInfo('Não consegui atualizar o Sync Vault agora.')
    }
  }

  function patchNotificationPrefs(patch: Parameters<typeof setNotificationPreferences>[0]) {
    setNotificationPrefs(setNotificationPreferences(patch))
  }

  function toggleNotificationCategory(category: EuNotificationCategory) {
    patchNotificationPrefs({
      categories: {
        ...notificationPrefs.categories,
        [category]: !notificationPrefs.categories[category],
      },
    })
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

      <section className="security-panel notification-settings-panel">
        <SectionTitle eyebrow="NOTIFICAÇÕES" title="O EU te chama só quando vale" />
        <p>Controle o que pode voltar até você. Lembretes explícitos continuam sendo tratados como essenciais; o resto respeita seu limite diário e horário silencioso.</p>

        <button
          className={'security-toggle ' + (notificationPrefs.enabled ? 'active' : '')}
          onClick={() => patchNotificationPrefs({ enabled: !notificationPrefs.enabled })}
        >
          <i />
          <span>{notificationPrefs.enabled ? 'Notificações do EU ligadas' : 'Notificações do EU desligadas'}</span>
        </button>

        <div className="notification-category-grid">
          {([
            ['humor', 'Humor'],
            ['followup', 'Voltou pra você'],
            ['decision', 'Decisões'],
            ['capsule', 'Cápsulas'],
            ['weekly', 'Resumo semanal'],
            ['monthly', 'Resumo mensal'],
            ['ecosystem', 'Outros apps'],
            ['insight', 'Insights'],
          ] as Array<[EuNotificationCategory, string]>).map(([category, label]) => (
            <button
              key={category}
              className={notificationPrefs.categories[category] ? 'active' : ''}
              onClick={() => toggleNotificationCategory(category)}
            >
              <i />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="notification-settings-grid">
          <label>
            <span>Máximo de avisos comuns por dia</span>
            <select
              value={notificationPrefs.maxCommonPerDay}
              onChange={(event) => patchNotificationPrefs({ maxCommonPerDay: Number(event.target.value) })}
            >
              <option value={0}>só essenciais</option>
              <option value={1}>1 por dia</option>
              <option value={2}>2 por dia</option>
              <option value={3}>3 por dia</option>
            </select>
          </label>

          <label>
            <span>Início do silêncio</span>
            <input
              type="time"
              value={notificationPrefs.quietHours.start}
              onChange={(event) => patchNotificationPrefs({ quietHours: { ...notificationPrefs.quietHours, start: event.target.value } })}
            />
          </label>

          <label>
            <span>Fim do silêncio</span>
            <input
              type="time"
              value={notificationPrefs.quietHours.end}
              onChange={(event) => patchNotificationPrefs({ quietHours: { ...notificationPrefs.quietHours, end: event.target.value } })}
            />
          </label>
        </div>

        <div className="notification-inline-options">
          <button
            className={notificationPrefs.quietHours.enabled ? 'active' : ''}
            onClick={() => patchNotificationPrefs({ quietHours: { ...notificationPrefs.quietHours, enabled: !notificationPrefs.quietHours.enabled } })}
          >
            {notificationPrefs.quietHours.enabled ? '✓' : '○'} horário silencioso
          </button>
          <button
            className={notificationPrefs.discreetPreview ? 'active' : ''}
            onClick={() => patchNotificationPrefs({ discreetPreview: !notificationPrefs.discreetPreview })}
          >
            {notificationPrefs.discreetPreview ? '✓' : '○'} prévia discreta
          </button>
        </div>

        <NavLink className="notification-center-link" to="/notificacoes">abrir Central de notificações ↗</NavLink>
      </section>

      <section className="security-panel">
        <SectionTitle eyebrow="PRIVACIDADE AUTOMÁTICA" title="Tags que sempre nascem privadas" />
        <p>Ex.: relacionamento, saúde, família. Qualquer novo registro com uma dessas tags será marcado como Privado automaticamente.</p>
        <div className="private-tags-editor">
          <input value={privateTags} onChange={(event) => setPrivateTagsState(event.target.value)} placeholder="relacionamento, saúde, família" />
          <button onClick={savePrivateTags}>Salvar tags</button>
        </div>
      </section>

      <section className="security-panel vault-security-panel">
        <SectionTitle eyebrow="SYNC VAULT" title="Os seus apps, num cofre local" />
        <p>Fôlego, Traço e Repertório podem alimentar um envelope local cifrado com os resumos mais recentes e um digest do EU.</p>
        <div className="vault-security-row">
          <span>{vaultUpdatedAt ? 'atualizado em ' + formatDate(vaultUpdatedAt) : 'ainda não criado'}</span>
          <button onClick={() => void refreshVault()}>Atualizar cofre</button>
        </div>
        <small>{syncVaultSecurityNote()}</small>
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
          <span>⚠ O backup comum não é criptografado e inclui registros privados. Para guardar fora do aparelho, prefira o .eubackup seguro.</span>
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
