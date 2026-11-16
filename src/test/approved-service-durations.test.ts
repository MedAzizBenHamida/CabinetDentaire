import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Guard the actual seed migration, not an unrelated duplicate catalogue.
const sql = readFileSync('supabase/migrations/20261114130057_d6691f33-ffc6-4c81-ad44-1b6f01c80625.sql','utf8');
const insert = sql.split('INSERT INTO public.care_services(name,duration_minutes,is_active) VALUES')[1]?.split(';')[0] ?? '';
const rows = Array.from(insert.matchAll(/\('([^']+)',(\d+),(true|false)\)/g), m => ({ name: m[1], minutes: Number(m[2]), active: m[3] === 'true' }));
describe('Owner-approved service planning durations', () => {
 for (const [name,minutes] of [['Consultation',30],['Premier bilan',60],['Détartrage courant',30],['Nettoyage approfondi',60],['Obturation / soin de carie',60],['Couronne — séance',60],['Traitement de canal — séance',120]] as const) {
   it(`${name} is active with ${minutes} minutes`,()=>{expect(rows.filter(r=>r.name===name)).toEqual([{name,minutes,active:true}]);});
 }
});