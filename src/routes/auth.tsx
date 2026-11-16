import { createFileRoute } from "@tanstack/react-router";
import { StaffLogin } from "@/components/staff-login";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/auth")({ head: () => pageHead("Connexion du personnel", "Connexion sécurisée du personnel du Cabinet Dentaire Ben Hamida en Tunisie."), component: StaffLogin });