import { describe, expect, it } from "vitest";
const url = process.env['CABINET_TEST_SUPABASE_URL'];
const key = process.env['CABINET_TEST_PUBLISHABLE_KEY'];
// These concrete owner-approved dates have no exceptional closures. Once past,
// the public API correctly hides them; preserve the tests as configuration fixtures.
describe.skipIf(!url || !key || Date.now() >= Date.parse('2026-11-16T00:00:00+01:00'))('Owner-approved public opening periods', () => {
  async function periods(date: string) {
    if (!url || !key) throw new Error('Missing public test configuration');
    const response = await fetch(`${url}/rest/v1/rpc/available_request_periods`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ requested_date: date }) });
    expect(response.status).toBe(200);
    return response.json();
  }
  it('Monday to Friday offers morning and afternoon', async () => {
    for (const date of ['2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20']) expect(await periods(date)).toEqual(['AFTERNOON','MORNING']);
  });
  it('Saturday offers morning only', async () => { expect(await periods('2026-11-21')).toEqual(['MORNING']); });
  it('Sunday is closed', async () => { expect(await periods('2026-11-22')).toEqual([]); });
});