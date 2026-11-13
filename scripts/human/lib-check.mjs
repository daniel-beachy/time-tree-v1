// Shared by build-human.mjs and verify-pack.mjs: what a fact-check record is, and the fingerprint of a stop's text.
// The protocol is in docs/PLAN.md, "Fact-check pass".
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VERDICTS = ['supported', 'unsupported', 'contradicted', 'unreachable'];
export const MIN_BLURB_CLAIMS = 3;
export const MIN_DEEP_CLAIMS = 4;

/** The deep dive's Markdown for a stop, or '' if it has none. */
export function deepText(contentDir, stop) {
  const f = join(contentDir, 'deep', `${stop.id}.md`);
  return stop.deep && existsSync(f) ? readFileSync(f, 'utf8').trim() : '';
}

/** Changes whenever any reader-facing words of the stop change, so an edit after a check voids the check. */
export function stopHash(stop, deep) {
  const parts = [stop.title, stop.year, stop.yearEnd ?? '', stop.blurb, stop.dateNote ?? '', stop.debate ?? '', stop.chart?.note ?? '', deep.replace(/\s+/g, ' ')];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 12);
}

/** Problems with a stop's record, as strings. An empty list means the stop may carry `checked`. */
export function recordProblems(stop, deep, record) {
  if (!record) return ['has "checked" but no record in content/human/checks'];
  const out = [];
  if (record.hash !== stopHash(stop, deep)) out.push('its text changed after it was checked; check it again');
  if (record.date !== stop.checked) out.push(`"checked" (${stop.checked}) does not match the record's date (${record.date})`);
  const claims = record.claims ?? [];
  const n = (where) => claims.filter((c) => c.in === where).length;
  if (n('blurb') < MIN_BLURB_CLAIMS) out.push(`record has ${n('blurb')} blurb claims (at least ${MIN_BLURB_CLAIMS})`);
  if (deep && n('deep') < MIN_DEEP_CLAIMS) out.push(`record has ${n('deep')} deep-dive claims (at least ${MIN_DEEP_CLAIMS})`);
  for (const c of claims) {
    const label = `claim "${String(c.text).slice(0, 40)}"`;
    if (!c.text || !['blurb', 'deep'].includes(c.in)) out.push(`${label}: needs text and in: blurb | deep`);
    if (c.verdict !== 'supported') out.push(`${label}: verdict is "${c.verdict}", so the stop cannot be checked`);
    if (!(stop.sources ?? []).includes(c.source)) out.push(`${label}: source "${c.source}" is not one of the stop's sources`);
    if (!c.evidence || c.evidence.split(/\s+/).length > 40) out.push(`${label}: evidence must say where the source supports it, in 40 words or fewer`);
  }
  const used = new Set(claims.map((c) => c.source));
  for (const id of stop.sources ?? []) if (!used.has(id)) out.push(`source "${id}" supports no claim; drop it from the stop or record what it supports`);
  return out;
}
