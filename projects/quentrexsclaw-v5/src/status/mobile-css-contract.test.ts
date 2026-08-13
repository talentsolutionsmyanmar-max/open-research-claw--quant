/**
 * Quantrex Status Dashboard v0.1 — mobile (<=720px) CSS contract regression gate.
 *
 * This is a STATIC contract check on the responsive CSS, not a substitute for
 * visual proof. It locks in the rules that prevent the 390px cropping defects:
 *   - mobile cells set min-width: 0 (so flex/grid children can shrink);
 *   - mobile long-value areas have an explicit wrapping rule;
 *   - there is NO overflow-x masking rule (auto/hidden/scroll) on mobile — the
 *     layout must actually fit, not hide overflow;
 *   - value cells use block (label-above-value) layout, not a single flex row
 *     that crowds multi-child cells (Venue/Contract; Final State + DOWNGRADED).
 */
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'StatusDashboard.css'), 'utf8');

function extractMediaBlock(src: string, query: string): string {
  const start = src.indexOf(query);
  if (start < 0) throw new Error(`media query not found: ${query}`);
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return src.slice(start, end + 1);
}

const mobile = extractMediaBlock(css, '@media (max-width: 720px)');

describe('mobile (<=720px) CSS contract', () => {
  it('mobile cells set min-width: 0 (prevent child overflow)', () => {
    expect(mobile).toContain('min-width: 0');
  });

  it('mobile long-value areas have an explicit wrapping rule', () => {
    expect(mobile).toMatch(
      /overflow-wrap:\s*anywhere|word-break:\s*break-word|overflow-wrap:\s*break-word/
    );
  });

  it('does NOT mask horizontal overflow on mobile (no overflow-x: auto|hidden|scroll)', () => {
    expect(mobile).not.toMatch(/overflow-x:\s*(auto|hidden|scroll)/);
  });

  it('mobile value cells use block layout, not a single crowding flex row', () => {
    // The previous defect forced the label + every value child into one flex row.
    expect(mobile).not.toMatch(/flex:\s*0 0 38%/);
    expect(mobile).toContain('display: block');
  });
});
