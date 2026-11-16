import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { FaqSection, ContactSection } from "@/components/public-sections";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/faq")({head:()=>pageHead("Questions fréquentes", "Rendez-vous, horaires et soins pour enfants : les réponses du Cabinet Dentaire Ben Hamida."),component:FaqPage});
function FaqPage(){return <PublicShell><FaqSection/><ContactSection/></PublicShell>;}