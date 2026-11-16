import { describe, expect, it } from "vitest";

const url = process.env['CABINET_TEST_SUPABASE_URL'];
const key = process.env['CABINET_TEST_PUBLISHABLE_KEY'];

describe.skipIf(!url || !key)("Staff API anonymous access", () => {
  for (const table of ["profiles", "staff_accounts", "user_roles", "patients", "patient_change_events", "patient_read_events", "care_resources", "care_services", "opening_intervals", "exceptional_closures", "professional_authorizations", "agenda_entries", "appointment_requests", "medical_notes", "medical_note_versions", "cabinet_audit_events"]) {
    it(`does not return anonymous ${table} rows`, async () => {
      if (!url || !key) throw new Error("Missing public integration test configuration");
      const column = ["profiles", "staff_accounts", "user_roles", "professional_authorizations"].includes(table) ? "user_id" : "id";
      const response = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, {
        headers: { apikey: key },
      });
      if (response.status === 401 || response.status === 403) {
        expect([401, 403]).toContain(response.status);
        return;
      }
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });
  }
  for (const [name, data] of [
    ["search_patients", { search_text: "", page_size: 1, page_offset: 0 }],
    ["resolve_request_patient", { request_id: "00000000-0000-0000-0000-000000000000" }],
    ["read_patient", { patient_id: "00000000-0000-0000-0000-000000000000" }],
    ["read_medical_notes", { selected_patient: "00000000-0000-0000-0000-000000000000" }],
    ["read_medical_note_history", { selected_note: "00000000-0000-0000-0000-000000000000" }],
    ["read_appointment_requests", {}],
    ["read_cabinet_audit", {}],
    ["read_agenda", { window_start: "2026-11-14T00:00:00Z", window_end: "2026-11-15T00:00:00Z" }],
    ["save_patient_record", { patient_id: null, given_name: "Test", family_name: "Test", date_of_birth: "2000-01-01", tunisian_phone: "+21612345678" }],
    ["save_medical_note", { note_id: null, selected_patient: "00000000-0000-0000-0000-000000000000", note_content: "Test" }],
    ["confirm_appointment_request", { request_id: "00000000-0000-0000-0000-000000000000", selected_patient: "00000000-0000-0000-0000-000000000000", selected_resource: "00000000-0000-0000-0000-000000000000", selected_service: "00000000-0000-0000-0000-000000000000", begins_at: "2026-11-14T09:00:00Z" }],
    ["manage_staff_account", { target_user: "00000000-0000-0000-0000-000000000000", active: true, assigned_role: "SUPER_ADMIN", display_name: "Test" }],
    ["submit_appointment_request", { given_name: "Test", family_name: "Test", tunisian_phone: "+21612345678", requested_date: "2026-11-15", requested_period: "MORNING", birth_date: "2000-01-01", requested_care: null }],
  ] as const) {
    it(`denies anonymous calls to ${name}`, async () => {
      if (!url || !key) throw new Error("Missing public integration test configuration");
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      expect([401, 403]).toContain(response.status);
    });
  }
  it("exposes no period for a past date and no internal appointment details", async () => {
    if (!url || !key) throw new Error("Missing public integration test configuration");
    const response = await fetch(`${url}/rest/v1/rpc/available_request_periods`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_date: "2000-01-01" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});