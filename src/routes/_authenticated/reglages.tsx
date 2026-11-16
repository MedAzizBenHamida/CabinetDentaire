import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Pencil, Trash2, Save, Clock, CalendarOff, Stethoscope, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CabinetBrand } from "@/components/cabinet-brand";
import { StaffNavigation } from "@/components/staff-navigation";
import { readCabinetSettings, saveCareService, saveOpening, saveClosure, removeSetting } from "@/lib/settings.functions";
import { serviceInput, openingInput, closureInput } from "@/lib/settings-schemas";
import { pageHead } from "@/lib/page-head";

const settingsQuery = queryOptions({ queryKey: ["cabinet-settings"], queryFn: () => readCabinetSettings(), retry: false, staleTime: 0 });
const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
type Editor = { kind: "SERVICE" | "OPENING" | "CLOSURE"; id?: string; name?: string; minutes?: number; active?: boolean; resourceId?: string; weekday?: number; opens?: string; closes?: string; date?: string; reason?: string };
export const Route = createFileRoute("/_authenticated/reglages")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: () => pageHead("Réglages du cabinet", "Horaires, fermetures et durées des soins du Cabinet Dentaire Ben Hamida, réservés au personnel autorisé."),
  errorComponent: ({ reset }) => <main className="mx-auto max-w-xl px-6 py-16"><CabinetBrand /><h1 className="mt-10 text-2xl font-semibold">Réglages indisponibles</h1><p className="mt-4 text-muted-foreground">Vérifiez les droits de votre compte.</p><div className="mt-6 flex gap-3"><Button onClick={reset}><RefreshCw />Réessayer</Button><Button asChild variant="outline"><Link to="/patients" search={{ term: "", page: 0 }}>Patients</Link></Button></div></main>,
  component: Settings,
});
function Settings() {
  const { data } = useSuspenseQuery(settingsQuery);
  const cache = useQueryClient();
  const serviceSave = useServerFn(saveCareService);
  const openingSave = useServerFn(saveOpening);
  const closureSave = useServerFn(saveClosure);
  const remove = useServerFn(removeSetting);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; kind: "OPENING" | "CLOSURE" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resourceName = (id: string) => data.resources.find(r => r.id === id)?.name ?? "Ressource";
  function open(value: Editor) { setError(""); setEditor(value); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return; setError(""); setBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      if (editor.kind === "SERVICE") await serviceSave({ data: serviceInput.parse({ id: editor.id, name: f.get("name"), minutes: Number(f.get("minutes")), active: f.get("active") === "on" }) });
      else if (editor.kind === "OPENING") await openingSave({ data: openingInput.parse({ id: editor.id, resourceId: f.get("resourceId"), weekday: Number(f.get("weekday")), opens: f.get("opens"), closes: f.get("closes") }) });
      else await closureSave({ data: closureInput.parse({ id: editor.id, resourceId: f.get("resourceId"), date: f.get("date"), reason: f.get("reason") }) });
      await cache.invalidateQueries({ queryKey: ["cabinet-settings"] }); setEditor(null); setNotice("Réglage enregistré.");
    } catch (failure) { setError(failure instanceof Error && failure.name !== "ZodError" ? failure.message : "Vérifiez les champs et l’ordre des heures."); }
    finally { setBusy(false); }
  }
  async function confirmDelete() { if (!deleting) return; setBusy(true); setError(""); try { await remove({ data: deleting }); await cache.invalidateQueries({ queryKey: ["cabinet-settings"] }); setDeleting(null); setNotice("Réglage supprimé."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Suppression impossible."); } finally { setBusy(false); } }
  const add = (kind: Editor["kind"]) => data.canEdit && <Button variant="outline" onClick={() => open({ kind })}><Plus />Ajouter</Button>;
  const edit = (value: Editor) => data.canEdit && <Button variant="ghost" size="icon" title="Modifier" aria-label="Modifier" onClick={() => open(value)}><Pencil /></Button>;
  const trash = (id: string, kind: "OPENING" | "CLOSURE") => data.canEdit && <Button variant="ghost" size="icon" title="Supprimer" aria-label="Supprimer" onClick={() => { setError(""); setDeleting({ id, kind }); }}><Trash2 /></Button>;
  return <div className="min-h-screen bg-background"><header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 sm:px-10"><CabinetBrand /><Button variant="outline" asChild><Link to="/patients" search={{ term: "", page: 0 }}><ArrowLeft />Patients</Link></Button></header><StaffNavigation /><main className="mx-auto max-w-5xl px-5 py-10 sm:px-10"><p className="mb-3 text-xs uppercase text-muted-foreground">Cabinet / Réglages</p><h1 className="font-display text-3xl">Réglages du cabinet</h1><p className="mt-3 text-sm text-muted-foreground">Heure locale · Africa/Tunis</p>{notice && <p role="status" className="mt-5 text-sm text-primary">{notice}</p>}
    <section className="mt-10 border-t pt-7"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-semibold"><Stethoscope size={20} />Soins et durées</h2>{add("SERVICE")}</div>{data.services.length === 0 && <p className="py-8 text-sm text-muted-foreground">Aucun soin configuré</p>}<div className="divide-y">{data.services.map(s => <div key={s.id} className="flex items-center justify-between gap-4 py-4"><div><p className="break-words font-medium">{s.name}</p><p className="mt-1 text-sm text-muted-foreground">{s.duration_minutes} min · {s.is_active ? "Actif" : "Inactif"}</p></div>{edit({ kind: "SERVICE", id: s.id, name: s.name, minutes: s.duration_minutes, active: s.is_active })}</div>)}</div></section>
    <section className="mt-8 border-t pt-7"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-semibold"><Clock size={20} />Horaires hebdomadaires</h2>{add("OPENING")}</div>{data.openings.length === 0 && <p className="py-8 text-sm text-muted-foreground">Aucune plage d’ouverture configurée</p>}<div className="divide-y">{data.openings.map(o => <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{days[o.weekday]} · {o.opens_at.slice(0,5)}–{o.closes_at.slice(0,5)}</p><p className="mt-1 text-sm text-muted-foreground">{resourceName(o.resource_id)}</p></div><div className="flex">{edit({ kind: "OPENING", id: o.id, resourceId: o.resource_id, weekday: o.weekday, opens: o.opens_at.slice(0,5), closes: o.closes_at.slice(0,5) })}{trash(o.id,"OPENING")}</div></div>)}</div></section>
    <section className="mt-8 border-t pt-7"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-semibold"><CalendarOff size={20} />Fermetures exceptionnelles</h2>{add("CLOSURE")}</div>{data.closures.length === 0 && <p className="py-8 text-sm text-muted-foreground">Aucune fermeture exceptionnelle</p>}<div className="divide-y">{data.closures.map(c => <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-medium">{c.closed_on.split("-").reverse().join("/")}</p><p className="mt-1 text-sm text-muted-foreground">{resourceName(c.resource_id)}</p>{c.reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.reason}</p>}</div><div className="flex">{edit({ kind: "CLOSURE", id: c.id, resourceId: c.resource_id, date: c.closed_on, reason: c.reason })}{trash(c.id,"CLOSURE")}</div></div>)}</div></section>
    </main><Dialog open={Boolean(editor)} onOpenChange={(value) => { if (!value && !busy) setEditor(null); }}><DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto"><DialogTitle>{editor?.kind === "SERVICE" ? "Soin et durée" : editor?.kind === "OPENING" ? "Plage d’ouverture" : "Fermeture exceptionnelle"}</DialogTitle><DialogDescription>{editor?.id ? "Modifier le réglage" : "Nouveau réglage"}</DialogDescription>{editor && <form onSubmit={submit} className="space-y-5">{editor.kind === "SERVICE" ? <><label className="block space-y-2 text-sm font-medium">Nom du soin<Input name="name" defaultValue={editor.name} required maxLength={100} /></label><label className="block space-y-2 text-sm font-medium">Durée en minutes<Input name="minutes" type="number" min={1} max={1440} step={1} defaultValue={editor.minutes} required /></label><label className="flex items-center gap-3 text-sm"><input name="active" type="checkbox" defaultChecked={editor.active ?? true} />Actif</label></> : <><label className="block space-y-2 text-sm font-medium">Ressource de soins<select name="resourceId" defaultValue={editor.resourceId ?? data.resources[0]?.id} required disabled={Boolean(editor.id)} className="h-10 w-full rounded-md border border-input bg-background px-3">{data.resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>{editor.id && <input type="hidden" name="resourceId" value={editor.resourceId} />}</label>{editor.kind === "OPENING" ? <><label className="block space-y-2 text-sm font-medium">Jour<select name="weekday" defaultValue={editor.weekday ?? ""} required className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="" disabled>Choisir un jour</option>{days.map((day,i) => <option key={day} value={i}>{day}</option>)}</select></label><div className="grid grid-cols-2 gap-4"><label className="space-y-2 text-sm font-medium">Ouverture<Input type="time" name="opens" defaultValue={editor.opens} required /></label><label className="space-y-2 text-sm font-medium">Fermeture<Input type="time" name="closes" defaultValue={editor.closes} required /></label></div></> : <><label className="block space-y-2 text-sm font-medium">Date<Input name="date" type="date" defaultValue={editor.date} required /></label><label className="block space-y-2 text-sm font-medium">Motif confidentiel<Textarea name="reason" defaultValue={editor.reason ?? ""} maxLength={1000} /></label></>}</>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditor(null)}>Annuler</Button><Button disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</Button></div></form>}</DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(value) => { if (!value && !busy) setDeleting(null); }}><DialogContent className="w-[calc(100%-2rem)]"><DialogTitle>Supprimer ce réglage ?</DialogTitle><DialogDescription>Cette suppression ne doit pas rendre un rendez-vous existant indisponible.</DialogDescription>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Annuler</Button><Button variant="destructive" disabled={busy} onClick={confirmDelete}><Trash2 />Supprimer</Button></div></DialogContent></Dialog>
  </div>;
}