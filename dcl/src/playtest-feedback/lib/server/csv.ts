export const CSV_HEADER = 'id,timeUtc,version,questionId,questionText,trigger,rating,ratingLabel,scale,commentPrompt,comment,secondsInScene,playersInScene,address,isGuest,platform'

export type CsvRow = {
  id: string
  serverTs: number
  version: string
  questionId: string
  questionText: string
  trigger: string
  rating: number | null
  ratingLabel: string
  scale: string
  commentPrompt: string
  comment: string
  secondsInScene: number
  playersInScene: number
  address: string
  isGuest: boolean | null
  platform: string
}

export function formatRow(row: CsvRow): string {
  return [
    field(row.id),
    // "2026-09-30 12:27:33": parsed as a date-time by Sheets and Excel, unlike ISO with a Z.
    new Date(row.serverTs).toISOString().slice(0, 19).replace('T', ' '),
    row.version,
    row.questionId,
    field(row.questionText),
    field(row.trigger),
    row.rating === null ? '' : `${row.rating}`,
    field(row.ratingLabel),
    field(row.scale),
    field(row.commentPrompt),
    field(row.comment),
    `${row.secondsInScene}`,
    `${row.playersInScene}`,
    row.address,
    row.isGuest === null ? '' : `${row.isGuest}`,
    field(row.platform)
  ].join(',')
}

// Safe because ids are [A-Za-z0-9-] and fields have no newlines: a row's id is everything before its first comma.
export function rowIds(csv: string): Set<string> {
  return new Set(csv.split('\n').map((line) => line.slice(0, line.indexOf(','))))
}

export function sanitizeId(requestId: string): string {
  // no leading -: field() would prefix it and rowIds() would miss the row
  return requestId.replace(/[^A-Za-z0-9-]/g, '').replace(/^-+/, '').slice(0, 40)
}

// Newlines flattened (one row = one line). Leading = + - @, after any whitespace, prefixed with ' so
// spreadsheets don't run it as a formula.
function field(value: string): string {
  let v = value.replace(/[\r\n]+/g, ' ')
  if (/^\s*[=+\-@]/.test(v)) v = `'${v}`
  // ; too: Excel in ;-separator locales would split there, and the next cell could start with =
  return /[",;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// Storage counts bytes. No TextEncoder/Buffer in the runtime.
export function utf8Length(s: string): number {
  let bytes = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 0x80) bytes += 1
    else if (c < 0x800) bytes += 2
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}
