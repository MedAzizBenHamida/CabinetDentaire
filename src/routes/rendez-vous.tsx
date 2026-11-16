import { createFileRoute } from "@tanstack/react-router";
import { PatientRequest } from "@/components/patient-request";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/rendez-vous")({
  head: () => pageHead("Demande de rendez-vous", "Demandez un rendez-vous au Cabinet Dentaire Ben Hamida en Tunisie, sans compte patient."),
  component: PatientRequest,
});
