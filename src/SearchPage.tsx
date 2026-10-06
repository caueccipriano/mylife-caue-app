import { type FormEvent, useMemo, useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { useRecords } from './appState'
import { searchLife } from './lifeCommandCenter'
import { BrandTop, EuIcon, Tag, typeTone } from './v2Ui'

const shortcuts = [
  { label: 'Dinheiro', detail: 'gastos, orçamento e Fôlego', route: '/dinheiro', icon: 'wallet' as const, terms: ['dinheiro','gasto','gastei','cartão','cartao','orçamento','orcamento','fôlego','folego','conta','dívida','divida'] },
  { label: 'Central', detail: 'objetivos, projetos e agenda', route: '/sistema', icon: 'collections' as const, terms: ['objetivo','meta','projeto','agenda','pendência','pendencia','central'] },
  { label: 'Memórias', detail: 'arquivo, coleções e histórico', route: '/memorias', icon: 'sparkles' as const, terms: ['memória','memoria','arquivo','coleção','colecao','histórico','historico','lembrar'] },
  { label: 'Perguntar ao EU', detail: 'cruzar contexto e encontrar uma resposta', route: '/pergunte', icon: 'search' as const, terms: ['por que','porque','como','quem','onde','quando','o que','qual'] },
]

function compact(value: string, size = 108) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

export default function SearchPage() {
  const records = useRecords()
  const inputRef = useRef<HTMLInputElement>(null)
  const [params, setParams] = useSearchParams()
  const initial = params.get('q')?.trim() || ''
  const [query, setQuery] = useState(initial)
  const searched = initial

  const results = useMemo(() => searched ? searchLife(records, searched).slice(0, 18) : [], [records, searched])
  const matchedShortcuts = useMemo(() => {
    const value = searched.toLocaleLowerCase('pt-BR')
    if (!value) return shortcuts.slice(0, 3)
    const matched = shortcuts.filter((item) => item.terms.some((term) => value.includes(term)))
    return matched.length ? matched : shortcuts.slice(0, 3)
  }, [searched])

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    setParams(value ? { q: value } : {}, { replace: true })
  }

  function clear() {
    setQuery('')
    setParams({}, { replace: true })
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="v2-page eu-search-page">
      <BrandTop />

      <header className="eu-search-hero">
        <Tag tone="cobalt">BUSCA NO EU</Tag>
        <h1>Encontre qualquer<br />coisa da sua vida.</h1>
        <p>Pesquise decisões, projetos, pessoas, ideias, memórias e registros. Se a pergunta precisar de contexto, o Brain continua dali.</p>
      </header>

      <form className="eu-search-box" onSubmit={submit}>
        <EuIcon name="search" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: carro · SQL · Giovani · faculdade"
          aria-label="Buscar no EU"
        />
        {query && <button type="button" className="eu-search-clear" onClick={clear} aria-label="Limpar busca"><EuIcon name="x" /></button>}
        <button type="submit" className="eu-search-submit" aria-label="Buscar"><EuIcon name="arrow-right" /></button>
      </form>

      {!searched && (
        <section className="eu-search-empty-state">
          <span><EuIcon name="search" /></span>
          <div>
            <strong>Seu arquivo inteiro, sem navegar por pastas.</strong>
            <p>Escreva do jeito que você lembra. O EU procura no texto, área, tipo e contexto dos seus registros.</p>
          </div>
        </section>
      )}

      {searched && (
        <section className="eu-search-results">
          <div className="eu-search-results-head">
            <div><small>RESULTADOS</small><h2>“{searched}”</h2></div>
            <span>{results.length} encontrado{results.length === 1 ? '' : 's'}</span>
          </div>

          <div className="eu-search-records">
            {results.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id} className="eu-search-result-card">
                <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                <div>
                  <strong>{compact(record.text)}</strong>
                  <small>{record.area}{record.nextMove ? ' · próximo: ' + compact(record.nextMove, 54) : ''}</small>
                </div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}

            {!results.length && (
              <div className="eu-search-no-result">
                <span><EuIcon name="search" /></span>
                <div><strong>Nada no arquivo com esse contexto.</strong><p>O Brain pode tentar responder usando relações e sinais, sem inventar o que não existe.</p></div>
              </div>
            )}
          </div>

          <NavLink className="eu-search-ask" to={'/pergunte?q=' + encodeURIComponent(searched)}>
            <span><EuIcon name="sparkles" /></span>
            <div><small>QUER ENTENDER, NÃO SÓ ENCONTRAR?</small><strong>Perguntar isso ao EU</strong></div>
            <EuIcon name="arrow-up-right" />
          </NavLink>
        </section>
      )}

      <section className="eu-search-shortcuts">
        <div className="eu-search-section-label"><small>ATALHOS</small><span>ir direto</span></div>
        <div>
          {matchedShortcuts.map((item) => (
            <NavLink key={item.route} to={item.route}>
              <span><EuIcon name={item.icon} /></span>
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
              <EuIcon name="arrow-up-right" />
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  )
}
