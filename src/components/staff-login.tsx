import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CabinetBrand } from "./cabinet-brand";
import room from "@/assets/dental-room.jpg";

export function StaffLogin() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { let current = true; void supabase.auth.getUser().then(({ data }) => { if (current) setSignedIn(Boolean(data.user)); }); return () => { current = false; }; }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (failure) { setError("Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe."); return; }
      await navigate({ to: "/patients", search: { term: "", page: 0 } });
    } catch { setError("Connexion indisponible. Réessayez dans quelques instants."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
    <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
      <CabinetBrand />
      <Button asChild variant="link" className="mt-4 self-start p-0"><Link to="/rendez-vous">Demander un rendez-vous</Link></Button>
      <div className="mx-auto my-auto w-full max-w-sm py-16">
        <div className="mb-7 flex items-center gap-2 text-xs font-medium uppercase text-primary"><LockKeyhole size={14} /> Espace personnel</div>
        <h1 className="font-display text-4xl leading-tight">Cabinet Dentaire<br /><span className="text-primary">Ben Hamida</span></h1>
        <p className="mb-9 mt-4 text-sm text-muted-foreground">Connexion à votre espace cabinet.</p>
        {signedIn ? <div className="space-y-4"><Button className="h-12 w-full justify-between" onClick={() => navigate({ to: "/patients", search: { term: "", page: 0 } })}>Ouvrir les dossiers patients<ArrowRight /></Button><Button variant="outline" className="w-full" onClick={async () => { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); setSignedIn(false); }}>Déconnexion</Button></div> : <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Adresse e-mail</label><Input id="email" name="email" type="email" autoComplete="username" placeholder="nom@exemple.tn" required className="h-12" /></div>
          <div className="space-y-2"><label htmlFor="password" className="text-sm font-medium">Mot de passe</label><div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required className="h-12 pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button disabled={busy} className="h-12 w-full justify-between" type="submit">{busy ? "Connexion…" : "Se connecter"}<ArrowRight /></Button>
        </form>}
      </div>
      <footer className="flex items-center justify-between gap-4 border-t pt-5 text-xs text-muted-foreground"><span>Accès réservé au personnel</span><span>Tunisie · +216</span></footer>
    </section>
    <aside className="relative hidden overflow-hidden lg:block"><img src={room} width={1024} height={1536} alt="Illustration d’un espace de soins dentaires" className="absolute inset-0 h-full w-full object-cover" /><span className="absolute bottom-5 right-5 rounded bg-background/90 px-3 py-1 text-xs text-muted-foreground">Visuel d’illustration</span></aside>
  </main>;
}