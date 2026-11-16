import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Plus, Users, LogOut, ChevronLeft, ChevronRight, X, Pencil, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CabinetBrand } from "@/components/cabinet-brand";
import { StaffNavigation } from "@/components/staff-navigation";
import { searchPatients, savePatient } from "@/lib/patients.functions";
import { patientSchema, type Patient } from "@/lib/patient-schemas";
import { pageHead } from "@/lib/page-head";

const patientsQuery = (term: string, page: number) => queryOptions({ queryKey: ["patients", term, page], queryFn: () => searchPatients({ data: { term, page } }), staleTime: 0, retry: false });
export const Route = createFileRoute("/_authenticated/patients")({
  validateSearch: (input: Record<string, unknown>) => ({ term: typeof input['term'] === "string" ? input['term'].slice(0, 100) : "", page: Number.isInteger(Number(input['page'])) && Number(input['page']) >= 0 ? Number(input['page']) : 0 }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(patientsQuery(deps.term, deps.page)),
  head: () => pageHead("Dossiers patients", "Dossiers patients confidentiels du Cabinet Dentaire Ben Hamida, réservés au personnel autorisé."),
  errorComponent: ({ reset }) => <main className="mx-auto max-w-xl px-6 py-20"><CabinetBrand /><h1 className="mt-12 text-2xl font-semibold">Accès aux dossiers indisponible</h1><p className="mt-4 text-muted-foreground">Votre compte doit être actif et autorisé par le responsable du cabinet.</p><div className="mt-8 flex flex-wrap gap-3"><Button onClick={reset}><RefreshCw />Réessayer</Button><Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/auth"); }}>Retour à la connexion</Button></div></main>,
  component: Patients,
});

function Patients() {
  const { term, page } = Route.useSearch();
  const { data: patients } = useSuspenseQuery(patientsQuery(term, page));
  const navigate = useNavigate();
  const cache = useQueryClient();
  const save = useServerFn(savePatient);
  const [editing, setEditing] = useState<Patient | "new" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function signOut() { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = patientSchema.safeParse({ ...values, id: editing && editing !== "new" ? editing.id : undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Vérifiez les champs."); setBusy(false); return; }
    try { await save({ data: parsed.data }); await cache.invalidateQueries({ queryKey: ["patients"] }); setEditing(null); setNotice("Fiche patient enregistrée."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  const selected = editing && editing !== "new" ? editing : undefined;
  return <div className="min-h-screen bg-background">
    <header className="flex flex-wrap items-center justify-between gap-5 border-b px-6 py-5 lg:px-10"><CabinetBrand /><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/reglages">Réglages</Link></Button><Button variant="ghost" onClick={signOut}><LogOut />Déconnexion</Button></div></header>
    <StaffNavigation />
    <div className="flex min-h-[calc(100vh-86px)]">
      <aside className="hidden w-56 shrink-0 border-r bg-muted/40 px-5 py-10 lg:block"><div className="flex items-center gap-3 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-primary"><Users size={18} />Patients</div><p className="mt-10 px-4 text-xs text-muted-foreground">Espace cabinet</p></aside>
      <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-10">
        <div className="mb-9 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-2 text-xs uppercase text-muted-foreground">Cabinet / Patients</p><h1 className="font-display text-3xl sm:text-4xl">Dossiers patients</h1></div><Button onClick={() => { setError(""); setEditing("new"); }}><Plus />Nouveau patient</Button></div>
        <form className="mb-6 flex max-w-lg gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void navigate({ to: "/patients", search: { term: String(f.get("term")).trim(), page: 0 } }); }}><div className="relative grow"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input key={term} name="term" defaultValue={term} maxLength={100} aria-label="Rechercher un patient" placeholder="Nom, prénom ou téléphone" className="h-10 pl-10" /></div><Button variant="outline" type="submit" className="h-10">Rechercher</Button></form>
        {notice && <p role="status" className="mb-4 text-sm text-primary">{notice}</p>}
        <div className="overflow-x-auto border-y"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="px-4 py-4 font-medium">Patient</th><th className="px-4 py-4 font-medium">Date de naissance</th><th className="px-4 py-4 font-medium">Téléphone</th><th className="w-16 px-4 py-4"><span className="sr-only">Modifier</span></th></tr></thead><tbody>{patients.map(p => <tr key={p.id} className="border-t"><td className="px-4 py-5 font-medium"><Button asChild variant="link" className="h-auto whitespace-normal p-0 text-left"><Link to="/dossier/$patientId" params={{ patientId: p.id }} search={{ page: 0 }}>{p.last_name} {p.first_name}</Link></Button></td><td className="px-4 py-5 text-muted-foreground">{p.birth_date.split("-").reverse().join("/")}</td><td className="px-4 py-5">{p.phone}</td><td className="px-4 py-5"><Button variant="ghost" size="icon" title="Modifier la fiche" aria-label={`Modifier ${p.first_name} ${p.last_name}`} onClick={() => { setError(""); setEditing(p); }}><Pencil /></Button></td></tr>)}</tbody></table>
          {patients.length === 0 && <div className="py-20 text-center"><Users className="mx-auto mb-4 size-9 text-muted-foreground" /><p className="font-medium">{term ? "Aucun patient trouvé" : "Aucune fiche patient"}</p></div>}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>Page {page + 1} · {patients.length} fiche{patients.length > 1 ? "s" : ""}</span><div className="flex gap-2"><Button variant="outline" size="icon" title="Page précédente" aria-label="Page précédente" disabled={page === 0} onClick={() => navigate({ to: "/patients", search: { term, page: page - 1 } })}><ChevronLeft /></Button><Button variant="outline" size="icon" title="Page suivante" aria-label="Page suivante" disabled={patients.length < 25} onClick={() => navigate({ to: "/patients", search: { term, page: page + 1 } })}><ChevronRight /></Button></div></div>
      </main>
    </div>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay/60 p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="patient-title" className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg"><div className="mb-6 flex items-center justify-between gap-3"><h2 id="patient-title" className="text-xl font-semibold">{selected ? "Modifier le patient" : "Nouveau patient"}</h2><Button variant="ghost" size="icon" aria-label="Fermer" title="Fermer" disabled={busy} onClick={() => setEditing(null)}><X /></Button></div><form onSubmit={submit} className="space-y-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[{ name: "first_name", label: "Prénom" }, { name: "last_name", label: "Nom" }].map(field => <div className="space-y-2" key={field.name}><label htmlFor={field.name} className="text-sm font-medium">{field.label}</label><Input id={field.name} name={field.name} defaultValue={field.name === "first_name" ? selected?.first_name : selected?.last_name} required maxLength={100} /></div>)}</div><div className="space-y-2"><label htmlFor="birth_date" className="text-sm font-medium">Date de naissance</label><Input id="birth_date" name="birth_date" type="date" required defaultValue={selected?.birth_date} /></div><div className="space-y-2"><label htmlFor="phone" className="text-sm font-medium">Téléphone</label><Input id="phone" name="phone" type="tel" placeholder="+21612345678" required maxLength={12} defaultValue={selected?.phone} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Annuler</Button><Button disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</Button></div></form></section></div>}
  </div>;
}