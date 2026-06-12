import { CunaguaroLogo } from "./cunaguaro-logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 lg:flex-row lg:px-10">
        <div className="flex items-center gap-2">
          <CunaguaroLogo className="h-8 w-8" />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            RESUELVE<span className="text-primary font-extrabold text-[1.05em] inline-block ml-[0.03em] origin-left">YA!</span>
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ResuelveYa!. Todos los derechos reservados.
          Préstamos sujetos a aprobación crediticia.
        </p>
        <div className="flex gap-6 text-xs font-medium text-muted-foreground">
          <a href="#" className="hover:text-foreground">Términos</a>
          <a href="#" className="hover:text-foreground">Privacidad</a>
          <a href="#" className="hover:text-foreground">Ayuda</a>
        </div>
      </div>
    </footer>
  )
}
