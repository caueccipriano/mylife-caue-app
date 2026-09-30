import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveMemoryThreads } from '../src/memoryThreads.ts'

const base = (id, relatedIds = [], patch = {}) => ({
  id, relatedIds, text: 'Momento ' + id, area: 'Estudos',
  createdAt: '2026-09-01T12:00:00Z', ...patch,
})
const visible = r => !r.private && !r.trashedAt &&
  !(r.revealAt && !r.capsuleOpenedAt && Date.parse(r.revealAt) > Date.parse('2026-09-30T12:00:00Z'))
const today = Date.parse('2026-09-30T12:00:00Z')

test('groups explicit links, including a one-sided link, without duplicates', () => {
  const records = [base('a',['b','b']),base('b',['c']),base('c'),base('other')]
  const original = JSON.stringify(records)
  const threads = deriveMemoryThreads(records,visible,today)
  assert.equal(threads.length,1)
  assert.deepEqual(threads[0].members.map(r=>r.id), ['a','b','c'])
  assert.equal(JSON.stringify(records),original)
})

test('never exposes private, deleted, locked or invalid-date capsules via links', () => {
  const records = [
    base('safe',['second','private','trashed','sealed','invalid']),
    base('second'),
    base('private',['safe'],{private:true,text:'PRIVATE SECRET'}),
    base('trashed',['safe'],{trashedAt:'2026-09-20T00:00:00Z'}),
    base('sealed',['safe'],{revealAt:'2026-10-15T12:00:00Z'}),
    base('invalid',['safe'],{revealAt:'bad-date'}),
  ]
  const threads = deriveMemoryThreads(records,visible,today)
  assert.equal(threads.length,1)
  assert.deepEqual(threads[0].members.map(r=>r.id),['safe','second'])
  assert.equal(JSON.stringify(threads).includes('PRIVATE SECRET'),false)
})

test('sorts independent threads by recency and respects limit', () => {
  const records = [
    base('old-a',['old-b']),base('old-b'),
    base('new-a',['new-b'],{updatedAt:'2026-09-28T16:00:00Z'}),
    base('new-b',['new-a']),
  ]
  assert.equal(deriveMemoryThreads(records,visible,today,1).length,1)
  assert.equal(deriveMemoryThreads(records,visible,today,1)[0].lead.id,'new-a')
  assert.deepEqual(deriveMemoryThreads(records,visible,today,0),[])
})

test('a link pointing only through an invisible record must not create a thread', () => {
  const records=[base('a',['hidden']),base('hidden',['b'],{private:true}),base('b')]
  assert.deepEqual(deriveMemoryThreads(records,visible,today),[])
})
