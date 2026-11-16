import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public-shell";
import { CareSection, HoursSection, FaqSection, ContactSection } from "@/components/public-sections";
import { PatientRequest } from "@/components/patient-request";
import { cabinetPhones } from "@/lib/public-cabinet";
import room from "@/assets/dental-room.jpg";

export function PatientHome() {
 return <PublicShell><section className="relative isolate border-b"><img src={room} alt="Salle de soins dentaire illustrative" className="absolute inset-0 -z-20 size-full object-cover object-center"/><div className="absolute inset-0 -z-10 bg-overlay/75"/><div className="mx-auto max-w-6xl px-5 py-14 text-primary-foreground sm:px-10 sm:py-20"><p className="mb-5 text-xs uppercase">Cabinet dentaire · Tunisie</p><h1 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">Cabinet Dentaire<br/>Ben Hamida</h1><p className="mt-5 max-w-md text-lg leading-8">Un rendez-vous pour votre sourire.<br/>Des soins pour chaque étape de votre vie.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild className="h-12"><Link to="/rendez-vous">Demander un rendez-vous<ArrowRight/></Link></Button><Button asChild variant="secondary" className="h-12"><a href={cabinetPhones[1].href}><Phone/>{cabinetPhones[1].label}</a></Button></div><p className="mt-8 text-xs">Lundi–vendredi : 08h–13h · 15h–17h &nbsp; / &nbsp; Samedi : 08h–13h</p><p className="mt-6 text-[10px]">Photo d’illustration</p></div></section><CareSection compact/><HoursSection/><PatientRequest embedded/><FaqSection/><ContactSection/></PublicShell>;
}