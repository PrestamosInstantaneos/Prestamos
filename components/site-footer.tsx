function CunaguaroLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
    >
      <polygon points="15,45 25,15 42,35" />
      <polygon points="85,45 75,15 58,35" />
      <polygon points="42,35 50,28 58,35 70,55 50,85 30,55" />
      <polygon points="48,30 52,30 50,45" opacity="0.3" fill="#000" />
      <polygon points="38,36 41,36 39,45" opacity="0.3" fill="#000" />
      <polygon points="62,36 59,36 61,45" opacity="0.3" fill="#000" />
      <polygon points="37,48 45,46 41,52" className="text-primary" fill="currentColor" />
      <polygon points="63,48 55,46 59,52" className="text-primary" fill="currentColor" />
      <polygon points="46,65 54,65 50,71" />
      <circle cx="38" cy="62" r="1.5" />
      <circle cx="34" cy="64" r="1.5" />
      <circle cx="62" cy="62" r="1.5" />
      <circle cx="66" cy="64" r="1.5" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 lg:flex-row lg:px-10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary p-1.5">
            <CunaguaroLogo className="h-full w-full text-primary-foreground" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            RESUELVE<span className="text-primary">YA!</span>
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
