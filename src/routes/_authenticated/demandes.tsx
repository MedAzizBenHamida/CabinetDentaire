import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { Workspace, WorkspaceError } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { confirmRequest, readAgenda, readRequests, resolveRequestPatient } from "@/lib/workflows.functions";
import { matchesRequestPatient } from "@/lib/request-patient";
import { readCabinetSettings } from "@/lib/settings.functions";
import { calendarWindow, confirmInput, type AppointmentRequest } from "@/lib/workflow-schemas";
import { daySlots, formatDayFr, minutesToTime, slotConflicts, timeToMinutes } from "@/lib/slot-rules";
import type { Patient } from "@/lib/patient-schemas";
import { pageHead } from "@/lib/page-head";

const config = queryOptions({ queryKey: ["cabinet-settings"], queryFn: () => readCabinetSettings(), retry: false });
const requestsQuery = (page: number) => queryOptions({ queryKey: ["requests", page], queryFn: () => readRequests({ data: { page } }), retry: false });

export const Route = createFileRoute("/_authenticated/demandes")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(config), context.queryClient.ensureQueryData(requestsQuery(0))]),
  head: () => pageHead("Demandes de rendez-vous", "Validation des demandes de rendez-vous du Cabinet Dentaire Ben Hamida."),
  errorComponent: WorkspaceError,
  component: Requests,
});

function Requests() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const { data: rows } = useSuspenseQuery(requestsQuery(page));
  const { data: settings } = useSuspenseQuery(config);
  const cache = useQueryClient();
  const confirm = useServerFn(confirmRequest);
  const agendaFn = useServerFn(readAgenda);
  const resolvePatient = useServerFn(resolveRequestPatient);

  const [selected, setSelected] = useState<AppointmentRequest | null>(null);
  const [patient, setPatient] = useState<Patient>();
  const [resourceId, setResourceId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<"PREFERENCE" | "ALL">("PREFERENCE");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeResources = settings.resources.filter((r) => r.is_active);
  const activeServices = settings.services.filter((s) => s.is_active);
  const resource = resourceId || activeResources[0]?.id || "";

  const dayWindow = selected ? calendarWindow(selected.desired_date, "day") : null;
  const { data: dayEntries = [] } = useQuery({
    queryKey: ["agenda-day", selected?.desired_date],
    queryFn: () => {
      if (!dayWindow) throw new Error("Date requise.");
      return agendaFn({ data: { start: dayWindow.start, end: dayWindow.end, page: 0 } });
    },
    enabled: Boolean(selected && dayWindow),
  });

  const resolutionQuery = useQuery({
    queryKey: ["request-patient", selected?.id],
    queryFn: () => {
      if (!selected) throw new Error("Demande requise.");
      return resolvePatient({ data: { requestId: selected.id } });
    },
    enabled: Boolean(selected),
    staleTime: 0,
    retry: false,
  });
  const resolution = resolutionQuery.data;
  const compatiblePatients = selected && resolution ? resolution.patients.filter((p) => matchesRequestPatient(p, { ...selected, birth_date: resolution.birth_date })) : [];
  const assignedPatient = patient ?? (resolution?.status === "MATCH" ? compatiblePatients[0] : undefined);

  const openings = settings.openings.filter((o) => o.resource_id === resource);
  const busyIntervals = dayEntries.filter((e) => e.resource_id === resource && !e.is_cancelled);
  const slots = selected
    ? daySlots(openings, selected.desired_date, duration, mode === "PREFERENCE" ? selected.desired_period : "ALL").filter(
        (time) => !slotConflicts(selected.desired_date, time, duration, busyIntervals),
      )
    : [];

  const service = activeServices.find((s) => s.id === serviceId);
  const ready = Boolean(selected && !resolutionQuery.isFetching && !resolutionQuery.isError && resolution && (resolution.status === "NEW" || assignedPatient && compatiblePatients.some((p) => p.id === assignedPatient.id)) && serviceId && slot && resource);

  function open(request: AppointmentRequest) {
    setSelected(request);
    setPatient(undefined);
    setResourceId(activeResources[0]?.id ?? "");
    setServiceId("");
    setDuration(30);
    setMode("PREFERENCE");
    setSlot("");
    setError("");
  }

  async function submit() {
    if (!selected || !ready) return;
    setBusy(true);
    setError("");
    try {
      await confirm({
        data: confirmInput.parse({
          requestId: selected.id,
          patientId: assignedPatient?.id,
          resourceId: resource,
          serviceId,
          start: `${selected.desired_date}T${slot}:00+01:00`,
        }),
      });
      await Promise.all([cache.invalidateQueries({ queryKey: ["requests"] }), cache.invalidateQueries({ queryKey: ["agenda"] }), cache.invalidateQueries({ queryKey: ["agenda-day"] }), cache.invalidateQueries({ queryKey: ["patients"] }), cache.invalidateQueries({ queryKey: ["request-patient"] })]);
      setSelected(null);
      setNotice("Demande confirmée et rendez-vous créé.");
    } catch (v) {
      setError(v instanceof Error && v.name !== "ZodError" ? v.message : "Sélectionnez un patient, un soin et un créneau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace title="Demandes de rendez-vous">
      <div className="mb-6 flex flex-wrap gap-2">
        {[["ALL", "Toutes"], ["PENDING", "En attente"], ["CONFIRMED", "Confirmées"]].map(([value, label]) => (
          <Button key={value} variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value ?? "ALL")}>{label}</Button>
        ))}
      </div>
      {notice && <p role="status" className="mb-4 text-primary">{notice}</p>}
      <div className="divide-y border-y">
        {rows.filter((r) => filter === "ALL" || r.status === filter).map((r) => (
          <article key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <h2 className="font-semibold">{r.last_name} {r.first_name}</h2>
              <p className="mt-2 text-sm">{r.phone} · {r.desired_date.split("-").reverse().join("/")} · {r.desired_period === "MORNING" ? "Matin" : "Après-midi"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.desired_care ? `Soin souhaité : ${r.desired_care} · ` : ""}{r.status === "PENDING" ? "En attente" : "Confirmée"}</p>
            </div>
            {r.status === "PENDING" && <Button variant="outline" onClick={() => open(r)}><Check />Confirmer</Button>}
          </article>
        ))}
        {rows.length === 0 && <p className="py-16 text-center text-muted-foreground">Aucune demande</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédente</Button>
          <Button variant="outline" disabled={rows.length < 25} onClick={() => setPage(page + 1)}>Suivante</Button>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(v) => { if (!v && !busy) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle className="font-display text-2xl">Affecter un rendez-vous</DialogTitle>
          <DialogDescription>{selected ? formatDayFr(selected.desired_date) : ""}</DialogDescription>
          {selected && (
            <div className="space-y-5">
              <div className="rounded-md border bg-surface-soft p-4">
                <p className="font-semibold">{selected.first_name} {selected.last_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selected.desired_care ?? "Soin non précisé"} · {selected.desired_period === "MORNING" ? "Matin" : "Après-midi"}</p>
              </div>

              <div className="space-y-3 border-y py-4">
                <p className="text-sm font-medium">Fiche patient · {selected.phone}</p>
                {resolutionQuery.isFetching && <p role="status" className="text-sm text-muted-foreground">Vérification de la fiche…</p>}
                {resolutionQuery.isError && <div><p role="alert" className="text-sm text-destructive">Vérification indisponible.</p><Button variant="outline" onClick={() => resolutionQuery.refetch()}>Réessayer</Button></div>}
                {!resolutionQuery.isFetching && resolution?.status === "NEW" && <p role="status" className="text-sm text-primary">Nouvelle fiche : création automatique lors de la confirmation.</p>}
                {!resolutionQuery.isFetching && assignedPatient && <p role="status" className="text-sm text-primary">Fiche associée : {assignedPatient.last_name} {assignedPatient.first_name} · {assignedPatient.phone} · {assignedPatient.birth_date.split("-").reverse().join("/")}</p>}
                {resolution?.status === "AMBIGUOUS" && <><p className="text-sm text-muted-foreground">Plusieurs fiches compatibles : choisissez le patient.</p>{compatiblePatients.map((p) => <Button key={p.id} variant={assignedPatient?.id === p.id ? "default" : "outline"} className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setPatient(p)}>{p.last_name} {p.first_name} · {p.phone} · {p.birth_date.split("-").reverse().join("/")}</Button>)}</>}
                {resolution?.status === "REVIEW" && <p role="alert" className="text-sm text-destructive">Une fiche porte ce nom et ce numéro, mais la naissance ne correspond pas ou trop de fiches existent. Vérifiez le dossier avant de confirmer.</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {activeResources.length > 1 && (
                  <label className="block space-y-2 text-sm font-medium">Ressource
                    <select value={resource} onChange={(e) => { setResourceId(e.target.value); setSlot(""); }} className="h-11 w-full rounded-md border bg-background px-3">
                      {activeResources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="block space-y-2 text-sm font-medium">Soin *
                  <select
                    value={serviceId}
                    onChange={(e) => {
                      setServiceId(e.target.value);
                      const next = activeServices.find((s) => s.id === e.target.value);
                      if (next) setDuration(next.duration_minutes);
                      setSlot("");
                    }}
                    className="h-11 w-full rounded-md border bg-background px-3"
                  >
                    <option value="" disabled>Choisir un soin</option>
                    {activeServices.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}
                  </select>
                </label>
                <label className="block space-y-2 text-sm font-medium">Durée (min)
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={duration}
                    onChange={(e) => { setDuration(Number(e.target.value)); setSlot(""); }}
                    className="h-11"
                  />
                </label>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => { setMode(mode === "PREFERENCE" ? "ALL" : "PREFERENCE"); setSlot(""); }}>
                    {mode === "PREFERENCE" ? "Voir toute la journée" : "Limiter à la préférence"}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Créneaux de la journée</p>
                {slots.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Aucun créneau libre pour cette durée{mode === "PREFERENCE" ? " sur la période préférée" : ""}.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {slots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSlot(time)}
                        aria-pressed={slot === time}
                        className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${slot === time ? "border-primary bg-primary text-primary-foreground" : "bg-surface-soft hover:border-primary/50"}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {slot && (
                <div className="rounded-md border bg-surface-soft p-4 text-sm">
                  <p className="font-semibold">Résumé</p>
                  <dl className="mt-2 space-y-1 text-muted-foreground">
                    <div className="flex gap-2"><dt className="w-16">Patient</dt><dd>: {selected.first_name} {selected.last_name}</dd></div>
                    <div className="flex gap-2"><dt className="w-16">Soin</dt><dd>: {service?.name ?? "—"}</dd></div>
                    <div className="flex gap-2"><dt className="w-16">Date</dt><dd>: {formatDayFr(selected.desired_date)}</dd></div>
                    <div className="flex gap-2"><dt className="w-16">Horaire</dt><dd>: {slot} – {minutesToTime(timeToMinutes(slot) + duration)}</dd></div>
                  </dl>
                </div>
              )}

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="h-12 w-full rounded-full" disabled={busy || !ready} onClick={submit}>
                <Check />{busy ? "Confirmation…" : "Confirmer le rendez-vous"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Workspace>
  );
}
