import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Pencil, History, LockKeyhole, Save, ChevronLeft, ChevronRight, RefreshCw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CabinetBrand } from "@/components/cabinet-brand";
import { StaffNavigation } from "@/components/staff-navigation";
import { readMedicalDossier, saveMedicalNote, readNoteHistory, readPatientAppointments } from "@/lib/medical.functions";
import { noteInputSchema, type MedicalNote } from "@/lib/medical-schemas";
import { pageHead } from "@/lib/page-head";

const dossierQuery = (patientId: string, page: number) => queryOptions({ queryKey: ["medical-dossier", patientId, page], queryFn: () => readMedicalDossier({ data: { patientId, page } }), retry: false, staleTime: 0 });
const appointmentsQuery = (patientId: string, page: number) => queryOptions({ queryKey: ["patient-appointments", patientId, page], queryFn: () => readPatientAppointments({ data: { patientId, page } }), retry: false, staleTime: 0 });
export const Route = createFileRoute("/_authenticated/dossier/$patientId")({
  validateSearch: (input: Record<string, unknown>): { page: number; appointmentsPage?: number } => ({ page: Number.isInteger(Number(input['page'])) && Number(input['page']) >= 0 ? Number(input['page']) : 0, appointmentsPage: Number.isInteger(Number(input['appointmentsPage'])) && Number(input['appointmentsPage']) >= 0 ? Number(input['appointmentsPage']) : 0 }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => Promise.all([context.queryClient.ensureQueryData(dossierQuery(params.patientId, deps.page)), context.queryClient.ensureQueryData(appointmentsQuery(params.patientId, deps.appointmentsPage ?? 0))]),
  head: () => pageHead("Fiche patient et historique", "Rendez-vous passés et notes médicales confidentiels du Cabinet Dentaire Ben Hamida, réservés au personnel autorisé."),
  errorComponent: ({ reset }) => <main className="mx-auto max-w-xl px-6 py-16"><CabinetBrand /><h1 className="mt-10 text-2xl font-semibold">Dossier indisponible</h1><p className="mt-4 text-muted-foreground">Vérifiez les droits de votre compte ou réessayez.</p><div className="mt-6 flex gap-3"><Button onClick={reset}><RefreshCw />Réessayer</Button><Button asChild variant="outline"><Link to="/patients" search={{ term: "", page: 0 }}>Patients</Link></Button></div></main>,
  component: Dossier,
});
const dateLabel = (date: string) => new Intl.DateTimeFormat("fr-TN", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Tunis" }).format(new Date(date));

function Dossier() {
  const { patientId } = Route.useParams();
  const { page, appointmentsPage = 0 } = Route.useSearch();
  const { data } = useSuspenseQuery(dossierQuery(patientId, page));
  const { data: appointments } = useSuspenseQuery(appointmentsQuery(patientId, appointmentsPage));
  const cache = useQueryClient();
  const save = useServerFn(saveMedicalNote);
  const [editing, setEditing] = useState<MedicalNote | "new" | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [finalizing, setFinalizing] = useState<MedicalNote | null>(null);
  const [historyNote, setHistoryNote] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const history = useQuery({ queryKey: ["note-history", historyNote, historyPage], queryFn: () => { if (!historyNote) throw new Error("Note requise"); return readNoteHistory({ data: { noteId: historyNote, page: historyPage } }); }, enabled: Boolean(historyNote), retry: false });
  function startEdit(note: MedicalNote | "new") { setError(""); setContent(note === "new" ? "" : note.content); setEditing(note); }
  async function persist(finalize: boolean) {
    const note = finalize ? finalizing : editing !== "new" ? editing : null;
    const parsed = noteInputSchema.safeParse({ patientId, noteId: note?.id, revision: note?.revision, content: finalize ? note?.content : content, finalize });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Vérifiez la note."); return; }
    setBusy(true); setError("");
    try { await save({ data: parsed.data }); await cache.invalidateQueries({ queryKey: ["medical-dossier", patientId] }); await cache.invalidateQueries({ queryKey: ["note-history"] }); setEditing(null); setFinalizing(null); setNotice(finalize ? "Note finalisée." : "Note enregistrée."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Opération impossible."); }
    finally { setBusy(false); }
  }
  function closeEdit(open: boolean) { if (!open && !busy && (content === (editing && editing !== "new" ? editing.content : "") || window.confirm("Abandonner les modifications non enregistrées ?"))) setEditing(null); }
  return <div className="min-h-screen bg-background"><header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 sm:px-10"><CabinetBrand /><Button variant="outline" asChild><Link to="/patients" search={{ term: "", page: 0 }}><ArrowLeft />Patients</Link></Button></header><StaffNavigation />
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-10">
      <p className="mb-3 text-xs uppercase text-muted-foreground">Dossier patient / Notes médicales</p><h1 className="font-display text-3xl break-words">{data.patient.first_name} {data.patient.last_name}</h1>
      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4 border-b pb-8 text-sm"><div><dt className="text-muted-foreground">Date de naissance</dt><dd className="mt-1">{data.patient.birth_date.split("-").reverse().join("/")}</dd></div><div><dt className="text-muted-foreground">Téléphone</dt><dd className="mt-1">{data.patient.phone}</dd></div></dl>
      <section className="border-b py-8" aria-labelledby="past-appointments-title">
        <h2 id="past-appointments-title" className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="size-5 text-primary" />Rendez-vous passés</h2>
        {appointments.length === 0 ? <p className="py-8 text-sm text-muted-foreground">Aucun rendez-vous passé enregistré.</p> : <ul className="mt-5 divide-y">{appointments.map(appointment => <li key={appointment.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0"><p className="font-medium break-words">{appointment.service_name ?? "Rendez-vous"}</p><p className="mt-1 text-sm text-muted-foreground">{dateLabel(appointment.starts_at)} – {new Intl.DateTimeFormat("fr-TN", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(appointment.ends_at))}</p>{appointment.resource_name && <p className="mt-1 text-xs text-muted-foreground break-words">{appointment.resource_name}</p>}</div>
          <span className={appointment.is_cancelled ? "text-sm font-medium text-destructive" : "text-sm font-medium text-muted-foreground"}>{appointment.is_cancelled ? "Annulé" : "Passé"}</span>
        </li>)}</ul>}
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Page {appointmentsPage + 1}</span><div className="flex gap-2"><Button asChild variant="outline" size="icon" disabled={appointmentsPage === 0} title="Rendez-vous plus récents"><Link aria-label="Rendez-vous plus récents" aria-disabled={appointmentsPage === 0} to="/dossier/$patientId" params={{ patientId }} search={{ page, appointmentsPage: Math.max(0, appointmentsPage - 1) }} className={appointmentsPage === 0 ? "pointer-events-none opacity-50" : ""}><ChevronLeft /></Link></Button><Button asChild variant="outline" size="icon" disabled={appointments.length < 25} title="Rendez-vous plus anciens"><Link aria-label="Rendez-vous plus anciens" aria-disabled={appointments.length < 25} to="/dossier/$patientId" params={{ patientId }} search={{ page, appointmentsPage: appointmentsPage + 1 }} className={appointments.length < 25 ? "pointer-events-none opacity-50" : ""}><ChevronRight /></Link></Button></div></div>
      </section>
      <div className="my-8 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Notes médicales</h2><Button onClick={() => startEdit("new")}><Plus />Nouvelle note</Button></div>
      {notice && <p className="mb-5 text-sm text-primary" role="status">{notice}</p>}
      {data.notes.length === 0 && <div className="border-y py-16 text-center text-muted-foreground">Aucune note médicale</div>}
      <div className="space-y-5">{data.notes.map(note => <article key={note.id} className="rounded-lg border p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-sm font-semibold">{note.finalized_at ? "Finalisée" : "Brouillon"} · Version {note.revision}</span><p className="mt-1 text-xs text-muted-foreground">{dateLabel(note.updated_at)}</p></div><div className="flex flex-wrap gap-1"><Button variant="ghost" size="icon" title="Historique" aria-label={`Historique de la note version ${note.revision}`} onClick={() => { setHistoryPage(0); setHistoryNote(note.id); }}><History /></Button>{!note.finalized_at && <><Button variant="ghost" size="icon" title="Modifier la note" aria-label={`Modifier la note version ${note.revision}`} onClick={() => startEdit(note)}><Pencil /></Button>{data.canFinalize && <Button variant="outline" onClick={() => { setError(""); setFinalizing(note); }}><LockKeyhole />Finaliser</Button>}</>}</div></div><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{note.content}</p>{note.finalized_at && <p className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground"><LockKeyhole size={13} />Finalisée le {dateLabel(note.finalized_at)}</p>}</article>)}</div>
      <div className="mt-6 flex items-center justify-between"><span className="text-sm text-muted-foreground">Page {page + 1}</span><div className="flex gap-2"><Button asChild variant="outline" size="icon" disabled={page === 0} title="Page précédente"><Link aria-label="Page précédente" to="/dossier/$patientId" params={{ patientId }} search={{ page: Math.max(0, page - 1), appointmentsPage }} className={page === 0 ? "pointer-events-none opacity-50" : ""}><ChevronLeft /></Link></Button><Button asChild variant="outline" size="icon" title="Page suivante"><Link aria-label="Page suivante" to="/dossier/$patientId" params={{ patientId }} search={{ page: page + 1, appointmentsPage }} className={data.notes.length < 25 ? "pointer-events-none opacity-50" : ""}><ChevronRight /></Link></Button></div></div>
    </main>
    <Dialog open={Boolean(editing)} onOpenChange={closeEdit}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto"><DialogTitle>{editing === "new" ? "Nouvelle note" : "Modifier la note"}</DialogTitle><DialogDescription>Brouillon médical</DialogDescription><form onSubmit={(e: FormEvent) => { e.preventDefault(); void persist(false); }} className="space-y-4"><label className="text-sm font-medium" htmlFor="note-content">Contenu</label><Textarea id="note-content" value={content} onChange={(e) => setContent(e.target.value)} maxLength={20000} required className="min-h-60" disabled={busy} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => closeEdit(false)}>Annuler</Button><Button disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(finalizing)} onOpenChange={(open) => { if (!open && !busy) setFinalizing(null); }}><DialogContent className="w-[calc(100%-2rem)]"><DialogTitle>Finaliser la note ?</DialogTitle><DialogDescription>La note finalisée ne pourra plus être modifiée.</DialogDescription>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setFinalizing(null)}>Annuler</Button><Button disabled={busy} onClick={() => persist(true)}><LockKeyhole />{busy ? "Finalisation…" : "Confirmer"}</Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(historyNote)} onOpenChange={(open) => { if (!open) setHistoryNote(null); }}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto"><DialogTitle>Historique de la note</DialogTitle><DialogDescription>Versions enregistrées</DialogDescription>{history.isPending ? <p>Chargement…</p> : history.isError ? <div><p role="alert" className="text-sm text-destructive">Historique indisponible.</p><Button variant="outline" onClick={() => history.refetch()}><RefreshCw />Réessayer</Button></div> : <>{history.data.length === 0 && <p className="text-sm text-muted-foreground">Aucune version</p>}{history.data.map(version => <section key={version.id} className="border-t py-4"><h3 className="text-sm font-semibold">Version {version.revision} · {version.finalized_at ? "Finalisée" : "Brouillon"}</h3><p className="mt-1 text-xs text-muted-foreground">{dateLabel(version.created_at)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{version.content}</p></section>)}<div className="flex items-center justify-between"><span className="text-sm">Page {historyPage + 1}</span><div className="flex gap-2"><Button variant="outline" size="icon" title="Versions précédentes" aria-label="Versions précédentes" disabled={historyPage === 0} onClick={() => setHistoryPage(historyPage - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" title="Versions suivantes" aria-label="Versions suivantes" disabled={history.data.length < 25} onClick={() => setHistoryPage(historyPage + 1)}><ChevronRight /></Button></div></div></>}</DialogContent></Dialog>
  </div>;
}