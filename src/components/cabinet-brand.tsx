import logo from "@/assets/dental-logo.png";
export function CabinetBrand() {
  return <div className="flex items-center gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-background"><img src={logo} width={48} height={48} alt="" className="size-11 object-contain" /></span><div><p className="font-display text-lg leading-tight">Ben Hamida</p><p className="mt-1 text-[11px] uppercase text-muted-foreground">Cabinet dentaire · Tunisie</p></div></div>;
}