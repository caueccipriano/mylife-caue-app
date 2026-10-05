import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveDriftSignalsCore, isWaitingText, routeLifeOSContext } from '../src/lifeOSRules.ts'

const now = new Date()
const daysAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString()
const base = (id, patch = {}) => ({
  id,
  text: 'Registro ' + id,
  type: 'Projeto',
  area: 'Carreira',
  createdAt: daysAgo(2),
  updatedAt: daysAgo(2),
  status: 'active',
  ...patch,
})

test('waiting language is separated from user action', () => {
  assert.equal(isWaitingText('Aguardando', 'Resposta da empresa'), true)
  assert.equal(isWaitingText('Pendência', 'Aguardando resposta da empresa'), true)
  assert.equal(isWaitingText('Pendência', 'Enviar currículo'), false)
})

test('context router loads only relevant lenses', () => {
  const career = routeLifeOSContext('o que eu decidi sobre a vaga e meu salário?')
  assert.equal(career.areas.includes('Carreira'), true)
  assert.equal(career.types.includes('Decisão'), true)
  assert.equal(career.types.includes('Candidatura'), true)

  const money = routeLifeOSContext('como está meu orçamento e cartão?')
  assert.equal(money.areas.includes('Dinheiro'), true)
  assert.equal(money.areas.includes('Viagens'), false)
})

test('drift appears only when a declared focus has real inactivity evidence', () => {
  const oldCareer = base('career-old', { area: 'Carreira', updatedAt: daysAgo(16), createdAt: daysAgo(30) })
  const recentProject = base('personal-1', { area: 'Pessoal', updatedAt: daysAgo(1) })
  const recentProject2 = base('personal-2', { area: 'Pessoal', updatedAt: daysAgo(2) })
  const recentProject3 = base('personal-3', { area: 'Pessoal', updatedAt: daysAgo(3) })
  const recentProject4 = base('personal-4', { area: 'Pessoal', updatedAt: daysAgo(4) })
  const signals = deriveDriftSignalsCore([oldCareer, recentProject, recentProject2, recentProject3, recentProject4], ['Carreira'], now.getTime())
  assert.equal(signals.some((item) => item.id === 'neglected:Carreira'), true)
  assert.equal(signals.some((item) => item.id === 'attention:Pessoal'), true)
})

test('drift stays quiet when focus is still active', () => {
  const recentCareer = base('career-now', { area: 'Carreira', updatedAt: daysAgo(1) })
  const signals = deriveDriftSignalsCore([recentCareer], ['Carreira'], now.getTime())
  assert.deepEqual(signals, [])
})
