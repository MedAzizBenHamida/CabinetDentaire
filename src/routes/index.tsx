import { createFileRoute } from "@tanstack/react-router";
import { PatientHome } from "@/components/patient-home";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Cabinet Dentaire Ben Hamida — Soins et rendez-vous en Tunisie" },
    { name: "description", content: "Découvrez les soins, horaires et coordonnées du Cabinet Dentaire Ben Hamida en Tunisie. Demandez votre rendez-vous sans compte." },
    { property: "og:title", content: "Cabinet Dentaire Ben Hamida — Soins et rendez-vous en Tunisie" },
    { property: "og:description", content: "Soins dentaires, horaires, contact et demande de rendez-vous au Cabinet Dentaire Ben Hamida en Tunisie." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PatientHome,
});
