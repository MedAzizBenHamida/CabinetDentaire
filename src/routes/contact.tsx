import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { HoursSection, ContactSection } from "@/components/public-sections";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contact")({head:()=>pageHead("Contact et rendez-vous", "Contactez le Cabinet Dentaire Ben Hamida au +216 92 841 135 ou au +216 75 600 933 et consultez ses horaires."),component:ContactPage});
function ContactPage(){return <PublicShell><ContactSection/><HoursSection/></PublicShell>;}