import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { HoursSection, ContactSection } from "@/components/public-sections";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/cabinet")({head:()=>pageHead("Le cabinet et ses horaires", "Préparez votre visite au Cabinet Dentaire Ben Hamida et consultez les horaires d’ouverture à l’heure de Tunis."),component:CabinetPage});
function CabinetPage(){return <PublicShell><div className="mx-auto max-w-6xl px-5 py-10 sm:px-10"><h1 className="font-display text-4xl">Cabinet Dentaire Ben Hamida</h1></div><HoursSection/><ContactSection/></PublicShell>;}