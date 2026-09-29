import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCaptureLink, isDuplicateCaptureLink } from '../src/linkCapture.ts'

test('normalizes manual and pasted URLs consistently', () => {
  assert.equal(normalizeCaptureLink(' example.com/foo '), 'https://example.com/foo')
  assert.equal(normalizeCaptureLink('https://example.com'), 'https://example.com/')
})

test('rejects unsafe protocols, URLs carrying credentials and pasted text', () => {
  assert.equal(normalizeCaptureLink('javascript:alert(1)'), null)
  assert.equal(normalizeCaptureLink('https://username:secret@example.com'), null)
  assert.equal(normalizeCaptureLink('hello world'), null)
})

test('guards same-link duplicate attachments regardless of URL formatting', () => {
  const items=[{kind:'link',url:'https://example.com/'},{kind:'photo',url:'https://other.net'}]
  assert.equal(isDuplicateCaptureLink(items,normalizeCaptureLink('example.com')),true)
  assert.equal(isDuplicateCaptureLink(items,normalizeCaptureLink('other.net')),false)
})
