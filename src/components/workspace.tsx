import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CabinetBrand } from "./cabinet-brand";
import { StaffNavigation } from "./staff-navigation";
import { Button } from "./ui/button";
export function Workspace({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth" }); }
  return <div className="min-h-screen bg-background"><header className="border-b px-6 py-5 sm:px-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Espace cabinet</p><div className="mt-1"><CabinetBrand /></div></div><Button variant="outline" className="rounded-full" onClick={() => void signOut()}><LogOut />Déconnexion</Button></div></header><StaffNavigation /><main className="mx-auto max-w-6xl px-5 py-9 sm:px-10"><h1 className="mb-7 font-display text-3xl">{title}</h1>{children}</main></div>;
}
export function WorkspaceError({ reset }: { reset: () => void }) { return <Workspace title="Accès indisponible"><p className="mb-6 text-muted-foreground">Votre compte doit être actif et disposer des droits nécessaires.</p><div className="flex gap-3"><Button onClick={reset}><RefreshCw />Réessayer</Button><Button asChild variant="outline"><Link to="/patients" search={{ term: "", page: 0 }}>Patients</Link></Button></div></Workspace>; }
