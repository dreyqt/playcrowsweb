import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Exercise the shipped event presentation rules without connecting to Supabase.
const source = readFileSync(new URL('../src/events/EventCenter.tsx', import.meta.url), 'utf8')
const start = source.indexOf('const LATEST_CLIENT_DOWNLOADS:')
const end = source.indexOf('function RichText(', start)
assert.ok(start >= 0 && end > start, 'Event text normalization remains available')
const { normalizeDownloadText, localizeEvent } = vm.runInNewContext(
  stripTypeScriptTypes(source.slice(start, end)) + '\n({ normalizeDownloadText, localizeEvent })',
)

const pc = 'https://download.playcrows.com/p/PlayV1-PC-all-19.zip'
const android = 'https://download.playcrows.com/p/PlayAZ-v1-all-19.apk'
const discord = 'https://discord.gg/Kmwfee38c'
const locales = ['en', 'ko', 'th', 'pt', 'zh-TW', 'ru']

test('V1 downloads upgrade from both published path formats and HTTP schemes', () => {
  for (const path of ['p', 'pv1']) {
    for (const scheme of ['http', 'https']) {
      assert.equal(normalizeDownloadText(`${scheme}://download.playcrows.com/${path}/PlayV1-PC-all-11.zip`, 'v1', 'en'), pc)
      assert.equal(normalizeDownloadText(`${scheme}://download.playcrows.com/${path}/PlayAZ-v1-all-18.apk`, 'v1', 'en'), android)
    }
  }
  assert.equal(normalizeDownloadText(`${pc}\n${android}`, 'v1', 'en'), `${pc}\n${android}`)
})

test('only dates directly preceding a V1 installer are updated', () => {
  for (const newline of ['\n', '\r\n']) {
    const text = [
      'Event starts 【2026-09-01】',
      '【2026-09-21】', 'http://download.playcrows.com/p/PlayV1-PC-all-11.zip',
      '【2026-09-22】', 'http://download.playcrows.com/pv1/PlayAZ-v1-all-12.apk',
      '【2026-09-30】', 'https://example.com/event-rules',
    ].join(newline)
    const result = normalizeDownloadText(text, 'v1', 'en')
    assert.equal((result.match(/【2026-11-17】/g) ?? []).length, 2)
    assert.ok(result.includes('Event starts 【2026-09-01】'))
    assert.ok(result.includes('【2026-09-30】'))
    assert.ok(result.includes(pc))
    assert.ok(result.includes(android))
  }
})

test('known official invitations update without replacing unrelated or prefix-matching referrals', () => {
  for (const code of ['FQ3UZbFdFm', 'rq8Sfu7ZqW', 'ayxHdychr']) {
    for (const base of ['https://discord.gg/', 'http://discord.com/invite/', 'https://discordapp.com/invite/']) {
      assert.equal(normalizeDownloadText(`${base}${code}`, 'v1', 'en'), discord)
    }
  }
  const referrals = 'https://discord.gg/myReferral https://discord.gg/FQ3UZbFdFm-extra https://discord.com/channels/123/456'
  assert.equal(normalizeDownloadText(referrals, 'v1', 'en'), referrals)
  assert.equal(normalizeDownloadText(discord, 'v1', 'en'), discord)
})

test('V2 text retains its previous client normalization and invite/date behavior', () => {
  const text = '【2026-09-21】\nhttp://download.playcrows.com/pv2/PlayV2-PC-all-7.zip\nhttps://discord.gg/FQ3UZbFdFm'
  assert.equal(normalizeDownloadText(text, 'v2', 'en'), text.replace('PlayV2-PC-all-7.zip', 'PlayV2-PC-all-8.zip'))
  assert.equal(normalizeDownloadText(text, 'v1', 'en'), text.replace('https://discord.gg/FQ3UZbFdFm', discord))
})

for (const language of locales) {
  test(`${language}: localized event copy, displayed text, and action links use the current release`, () => {
    const promotion = `${language} promotion\n【2026-09-21】\nhttp://download.playcrows.com/p/PlayV1-PC-all-11.zip\n【2026-09-22】\nhttp://download.playcrows.com/p/PlayAZ-v1-all-12.apk\nhttps://discord.gg/FQ3UZbFdFm`
    const content = {
      title: `${language} client event`,
      short_description: promotion,
      description: promotion,
      mechanics: [promotion],
      rewards: ['Unchanged reward'],
      form_fields: [],
      action_links: [
        { id: 'copy', kind: 'copy', label: `${language} copy`, url: '', content: promotion },
        { id: 'pc', kind: 'url', label: 'PC', url: 'http://download.playcrows.com/pv1/PlayV1-PC-all-11.zip' },
        { id: 'android', kind: 'url', label: 'Android', url: 'http://download.playcrows.com/p/PlayAZ-v1-all-12.apk' },
        { id: 'discord', kind: 'url', label: 'Discord', url: 'https://discord.gg/FQ3UZbFdFm' },
        { id: 'referral', kind: 'url', label: 'Referral', url: 'https://discord.gg/playerReferral' },
      ],
    }
    const event = {
      id: 'fixture', server: 'v1', event_number: '007', slug: 'client-promotion', status: 'active',
      starts_at: '2026-09-21T00:00:00Z', ends_at: '2026-12-31T00:00:00Z', published_at: '2026-09-21T00:00:00Z',
      ...content,
      translations: language === 'en' ? {} : { [language]: content },
    }
    const original = JSON.stringify(event)
    const localized = localizeEvent(event, language)
    assert.equal(localized.title, content.title)
    for (const text of [localized.short_description, localized.description, localized.mechanics[0], localized.action_links[0].content]) {
      assert.ok(text.startsWith(`${language} promotion`))
      assert.ok(text.includes(pc))
      assert.ok(text.includes(android))
      assert.ok(text.includes(discord))
      assert.equal((text.match(/【2026-11-17】/g) ?? []).length, 2)
      assert.doesNotMatch(text, /all-(?:11|12)\.|2026-09-2[12]|FQ3UZbFdFm/)
    }
    assert.equal(localized.action_links[1].url, pc)
    assert.equal(localized.action_links[2].url, android)
    assert.equal(localized.action_links[3].url, discord)
    assert.equal(localized.action_links[4].url, 'https://discord.gg/playerReferral')
    assert.equal(localized.starts_at, event.starts_at)
    assert.equal(localized.ends_at, event.ends_at)
    assert.equal(localized.published_at, event.published_at)
    assert.equal(JSON.stringify(event), original, 'Presentation changes do not mutate stored event data')
  })
}

test('missing translations still normalize English fallback copy and preserve nullable fields', () => {
  const event = {
    server: 'v1', title: 'Client event', short_description: null, description: null,
    mechanics: [], rewards: [], form_fields: [],
    action_links: [{ id: 'pc', label: 'PC', url: 'http://download.playcrows.com/p/PlayV1-PC-all-11.zip' }],
  }
  for (const language of locales) {
    const localized = localizeEvent(event, language)
    assert.equal(localized.short_description, null)
    assert.equal(localized.description, null)
    assert.equal(localized.action_links[0].url, pc)
  }
})
