<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Keep validated domain rules browser-safe and framework-independent, with concrete unit tests; this allows reuse in the independent target without treating client checks as backend security.
- PostgreSQL must independently enforce booking conflicts and permissions; frontend interval checks are only pre-checks, not concurrency or authorization guarantees.
- Keep RLS security-definer authorization helpers in the unexposed private schema with caller-bound identity checks; this avoids public RPC exposure and recursive policies.
- Use public SECURITY INVOKER RPC wrappers around private caller-checked implementations for audited operations; direct confidential table reads cannot bypass audit.
- Store appointments and blocks in one agenda table with a PostgreSQL range exclusion constraint and resource-row locking; conflicts remain enforced under concurrency.
- Persist immutable note versions with optimistic revisions and independently verified professional eligibility; technical roles alone cannot authorize finalization.
- Leave unvalidated catalogues, opening hours and destructive retention automation unset; configuration must not invent clinical business decisions.
- Keep staff pages in the client-gated authenticated route subtree and attach Supabase bearer tokens through Start function middleware; protected server operations independently validate identity and database permissions.
- Parse patient RPC responses and form submissions with shared browser-safe schemas; audited database operations remain authoritative.
- Load medical dossiers and histories only through authenticated audited RPCs; finalization affordances use server-read professional eligibility while PostgreSQL remains the enforcement boundary.
- Read cabinet configuration using the authenticated RLS client and mutate it only through the existing administrator-checked RPCs; configuration forms never seed assumed clinical values.
- Keep agenda, request and staff inputs in browser-safe workflow schemas; confidential workflow reads and mutations use authenticated audited RPCs, while public submission calls only the existing narrow PENDING-only operation.
- Rate-limit public submissions with atomic private PostgreSQL counters keyed by a server-HMAC of the trusted connection address; never rely on worker memory or store raw IP addresses.
- Render the public patient request through one shared component on both home and the preserved appointment URL; staff sign-in remains separate at /auth to prevent divergent public forms.
- Share public navigation and informational sections across home and dedicated care, cabinet, FAQ and contact routes; keep public presentation separate from clinical booking configuration to avoid implicit database changes.
- Resolve request identities through an authenticated audited RPC and atomically reuse/create records inside confirmation under the patient-save identity lock; this prevents homonym misassociation and orphan records when booking fails.
- Read patient appointment history through a patient-scoped audited RPC with independent pagination; elapsed appointments do not imply attendance or completed treatment.
