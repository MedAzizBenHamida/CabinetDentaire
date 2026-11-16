import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, ArrowRight, ArrowLeft, CalendarDays, Sun, Sunset, Phone } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicOpenDays, publicPeriods, submitRequest } from "@/lib/workflows.functions";
import { requestInput, tunisDate } from "@/lib/workflow-schemas";
import { formatDayFr } from "@/lib/slot-rules";
import type { RequestPeriod } from "@/lib/cabinet-rules";
import { cabinetPhones, publicCare } from "@/lib/public-cabinet";
import room from "@/assets/dental-room.jpg";

const steps = ["Vos coordonnées", "La date", "La période", "Le soin"] as const;
const UNDECIDED = "Je ne sais pas encore";

export function PatientRequest({ embedded = false }: { embedded?: boolean }) {
  const openDaysFn = useServerFn(publicOpenDays);
  const periodsFn = useServerFn(publicPeriods);
  const submit = useServerFn(submitRequest);
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [date, setDate] = useState("");
  const [periods, setPeriods] = useState<RequestPeriod[]>([]);
  const [period, setPeriod] = useState<RequestPeriod | "">("");
  const [care, setCare] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const availabilityRequest = useRef(0);

  const daysRequested = useRef(false);
  useEffect(() => {
    if (step !== 1 || daysRequested.current) return;
    daysRequested.current = true;
    setDaysLoading(true);
    openDaysFn({ data: { days: 28 } })
      .then((open) => setDays(open))
      .catch(() => setError("Les dates sont momentanément indisponibles."))
      .finally(() => setDaysLoading(false));
  }, [step, openDaysFn]);

  async function availability(nextDate: string) {
    const request = ++availabilityRequest.current;
    setDate(nextDate); setError(""); setPeriods([]); setPeriod(""); setLoading(Boolean(nextDate));
    if (!nextDate) return;
    try {
      const available = await periodsFn({ data: { date: nextDate } });
      if (request === availabilityRequest.current) setPeriods(available);
    } catch {
      if (request === availabilityRequest.current) setError("Les périodes sont momentanément indisponibles.");
    } finally {
      if (request === availabilityRequest.current) setLoading(false);
    }
  }

  const contactValid = firstName.trim().length > 0 && lastName.trim().length > 0 && /^[0-9]{8}$/.test(phone) && birthDate.length > 0 && birthDate <= tunisDate();

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const website = new FormData(e.currentTarget).get("website");
    try {
      await submit({ data: requestInput.parse({ first_name: firstName, last_name: lastName, birth_date: birthDate, phone: `+216${phone}`, date, period, care, website }) });
      setSuccess(true);
    } catch (v) {
      setError(v instanceof Error && v.name !== "ZodError" ? v.message : "Vérifiez vos coordonnées et choisissez une période.");
    } finally { setBusy(false); }
  }

  function reset() { setSuccess(false); setStep(0); setDate(""); setPeriods([]); setPeriod(""); setCare(""); setError(""); }

  const sidebar = (
    <aside className="space-y-6">
      <div className="rounded-lg bg-primary p-7 text-primary-foreground sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl">Comment ça marche</h2>
        <ol className="mt-6 space-y-5 text-sm leading-6">
          <li><span className="font-semibold">1.</span> Vous renseignez vos coordonnées, une date et une période.</li>
          <li><span className="font-semibold">2.</span> Le cabinet vérifie les disponibilités et vous attribue un créneau.</li>
          <li><span className="font-semibold">3.</span> Vous recevez la confirmation avec l’heure exacte.</li>
        </ol>
      </div>
      <div className="rounded-lg border bg-card p-7 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Urgence ou question</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {cabinetPhones.map((p) => (
            <Button key={p.href} asChild variant="outline" className="h-11 rounded-full">
              <a href={p.href}><Phone />{p.label}</a>
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>
      {!embedded && <PublicHeader />}
      <div className="patient-enter">
        {!embedded && (
          <section className="border-b bg-surface-soft">
            <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-10 sm:py-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <p className="mb-4 text-xs font-medium uppercase text-primary">Votre rendez-vous · Tunisie</p>
                <h1 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">Cabinet Dentaire<br />Ben Hamida</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Un rendez-vous pour votre sourire.</p>
                <div className="mt-7 flex items-center gap-3 border-t pt-5 text-sm"><CalendarDays className="size-5 text-primary" /><span>Demande de rendez-vous</span></div>
              </div>
              <div className="relative">
                <img src={room} width={1024} height={1536} alt="Salle de soins dentaire illustrative" className="aspect-[16/9] w-full rounded-md object-cover lg:aspect-[4/3]" />
                <span className="absolute bottom-3 right-3 rounded-sm bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">Visuel d’illustration</span>
              </div>
            </div>
          </section>
        )}
        <section className="bg-surface-soft">
          <div className="mx-auto max-w-6xl px-5 py-9 sm:px-10 sm:py-12">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase text-primary">Prendre rendez-vous</p>
                <h2 className="font-display text-3xl">Votre prochaine visite</h2>
              </div>
              <span className="text-xs text-muted-foreground">Heure locale · Tunis</span>
            </div>
            {success ? (
              <div className="rounded-lg border bg-card p-10">
                <CheckCircle className="mb-4 size-9 text-primary" />
                <h2 className="font-display text-2xl">Votre demande est en attente</h2>
                <p className="mt-3 text-muted-foreground">Le cabinet doit la valider avant confirmation du rendez-vous.</p>
                <Button variant="outline" className="mt-6" onClick={reset}>Nouvelle demande</Button>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
                <form onSubmit={send} className="rounded-lg border bg-card p-6 sm:p-9">
                  <ol className="mb-8 flex flex-wrap gap-2">
                    {steps.map((label, i) => (
                      <li key={label}>
                        <button
                          type="button"
                          onClick={() => { if (i < step) setStep(i); }}
                          className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
                          aria-current={i === step ? "step" : undefined}
                        >
                          {i + 1}. {label}
                        </button>
                      </li>
                    ))}
                  </ol>

                  {step === 0 && (
                    <div>
                      <h3 className="font-display text-2xl">Vos coordonnées</h3>
                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium">Prénom *<Input className="h-12" name="first_name" required maxLength={100} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
                        <label className="space-y-2 text-sm font-medium">Nom *<Input className="h-12" name="last_name" required maxLength={100} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
                      </div>
                      <label className="mt-5 block space-y-2 text-sm font-medium">Téléphone *
                        <span className="flex">
                          <span className="flex h-12 items-center rounded-l-md border border-r-0 bg-muted px-4 text-sm text-muted-foreground">+216</span>
                          <Input className="h-12 rounded-l-none" type="tel" inputMode="numeric" name="phone_digits" required pattern="[0-9]{8}" placeholder="22 123 456" maxLength={8} autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))} />
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">Numéro tunisien à 8 chiffres.</span>
                      </label>
                      <label className="mt-5 block max-w-sm space-y-2 text-sm font-medium">Date de naissance *
                        <Input className="h-12" type="date" max={tunisDate()} required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                      </label>
                      <Button type="button" className="mt-8 h-12 rounded-full px-8" disabled={!contactValid} onClick={() => setStep(1)}>Continuer<ArrowRight /></Button>
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <h3 className="font-display text-2xl">Quelle date souhaitez-vous ?</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Seuls les jours d’ouverture du cabinet sont proposés.</p>
                      {daysLoading && <p role="status" className="mt-6 text-sm text-muted-foreground">Chargement des dates…</p>}
                      {!daysLoading && days.length === 0 && !error && <p className="mt-6 text-sm text-muted-foreground">Aucune date disponible pour le moment.</p>}
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {days.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => void availability(day)}
                            aria-pressed={date === day}
                            className={`rounded-md border px-4 py-3.5 text-left text-sm transition-colors ${date === day ? "border-primary bg-primary text-primary-foreground" : "bg-surface-soft hover:border-primary/50"}`}
                          >
                            {formatDayFr(day)}
                          </button>
                        ))}
                      </div>
                      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Recherche des périodes…</p>}
                      {date && !loading && !error && periods.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Aucune période sélectionnable pour cette date.</p>}
                      <div className="mt-8 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" className="h-12 rounded-full px-8" onClick={() => setStep(0)}><ArrowLeft />Retour</Button>
                        <Button type="button" className="h-12 rounded-full px-8" disabled={!date || loading || periods.length === 0} onClick={() => setStep(2)}>Continuer<ArrowRight /></Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h3 className="font-display text-2xl">Quelle période préférez-vous ?</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{formatDayFr(date)}</p>
                      <fieldset className="mt-6">
                        <legend className="mb-3 text-sm font-medium">Période souhaitée *</legend>
                        <div className="grid grid-cols-2 gap-3">
                          {[...periods].sort((a, b) => (a === "MORNING" ? -1 : b === "MORNING" ? 1 : 0)).map((p) => (
                            <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors ${period === p ? "border-primary bg-accent" : "bg-surface-soft"}`}>
                              <input type="radio" name="period" value={p} checked={period === p} onChange={() => setPeriod(p)} required className="size-4" />
                              {p === "MORNING" ? <Sun className="size-4 text-primary" /> : <Sunset className="size-4 text-primary" />}
                              <span className="text-sm">{p === "MORNING" ? "Matin" : "Après-midi"}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="mt-8 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" className="h-12 rounded-full px-8" onClick={() => setStep(1)}><ArrowLeft />Retour</Button>
                        <Button type="button" className="h-12 rounded-full px-8" disabled={!period} onClick={() => setStep(3)}>Continuer<ArrowRight /></Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h3 className="font-display text-2xl">Quel soin souhaitez-vous ? (facultatif)</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Si vous ne savez pas, laissez « {UNDECIDED} » : le cabinet prévoit 30 minutes et précisera avec vous.</p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {[{ name: UNDECIDED, description: "Le cabinet en discutera avec vous (30 minutes prévues)." }, ...publicCare].map((option) => {
                          const value = option.name === UNDECIDED ? "" : option.name;
                          const active = care === value;
                          return (
                            <button
                              key={option.name}
                              type="button"
                              onClick={() => setCare(value)}
                              aria-pressed={active}
                              className={`rounded-md border p-4 text-left transition-colors ${active ? "border-primary bg-accent" : "bg-surface-soft hover:border-primary/50"}`}
                            >
                              <span className="block text-sm font-semibold">{option.name}</span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-6 text-sm leading-6 text-muted-foreground">Cette demande ne constitue pas une confirmation de rendez-vous.</p>
                      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button type="button" variant="outline" className="h-12 rounded-full px-8" onClick={() => setStep(2)}><ArrowLeft />Retour</Button>
                        <Button className="h-12 rounded-full px-8" disabled={busy || loading || !period}>{busy ? "Envoi…" : "Envoyer la demande"}<ArrowRight /></Button>
                      </div>
                    </div>
                  )}

                  <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
                  <p className="mt-8 border-t pt-5 text-xs leading-5 text-muted-foreground">Vos informations servent uniquement à la gestion de votre rendez-vous. Aucun compte n’est nécessaire.</p>
                </form>
                {sidebar}
              </div>
            )}
          </div>
        </section>
      </div>
      {!embedded && <PublicFooter />}
    </div>
  );
}
