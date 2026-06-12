"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

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

const navLinks = [
  { label: "INICIO", href: "#inicio" },
  { label: "PRÉSTAMOS", href: "#prestamos" },
  { label: "SIMULADOR", href: "#simulador" },
  { label: "CÓMO FUNCIONA", href: "#como-funciona" },
  { label: "CONTACTO", href: "#solicitar" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ nombres: string; apellidos: string; telefono: string } | null>(null)

  useEffect(() => {
    function loadUser() {
      const stored = localStorage.getItem("user")
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    loadUser()
    window.addEventListener("auth-change", loadUser)
    return () => {
      window.removeEventListener("auth-change", loadUser)
    }
  }, [])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      localStorage.removeItem("user")
      setUser(null)
      window.dispatchEvent(new Event("auth-change"))
    } catch (err) {
      console.error("Error al cerrar sesión:", err)
    }
  }

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <a href="#inicio" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary p-1.5">
            <CunaguaroLogo className="h-full w-full text-primary-foreground" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            RESUELVE<span className="text-primary">YA!</span>
          </span>
        </a>

        <div className="hidden items-center gap-9 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-foreground uppercase">
                Hola, {user.nombres}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold tracking-widest text-foreground hover:bg-secondary transition-colors"
              >
                SALIR
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
            >
              INGRESAR
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        className={cn(
          "overflow-hidden border-t border-border bg-card/95 backdrop-blur lg:hidden",
          open ? "max-h-[450px]" : "max-h-0",
          "transition-all duration-300",
        )}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-sm font-semibold tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </a>
          ))}

          {user ? (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
              <span className="px-3 text-xs font-semibold text-foreground">HOLA, {user.nombres.toUpperCase()}</span>
              <button
                onClick={() => {
                  handleLogout()
                  setOpen(false)
                }}
                className="w-full text-left rounded-md px-3 py-3 text-sm font-semibold tracking-wide text-destructive hover:bg-secondary"
              >
                CERRAR SESIÓN
              </button>
            </div>
          ) : (
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 pt-2 border-t border-border rounded-md px-3 py-3 text-sm font-semibold tracking-wide text-primary hover:bg-secondary"
            >
              INICIAR SESIÓN
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
