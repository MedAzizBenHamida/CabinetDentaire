import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { CareSection, ContactSection } from "@/components/public-sections";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/soins")({head:()=>pageHead("Nos soins dentaires", "Découvrez les soins proposés au Cabinet Dentaire Ben Hamida : prévention, soins conservateurs, prothèses et soins pour enfants."),component:CarePage});
function CarePage(){return <PublicShell><CareSection/><ContactSection/></PublicShell>;}