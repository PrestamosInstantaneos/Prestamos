"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CunaguaroLogo } from "./cunaguaro-logo"
import useSWR from "swr"
import { getLevelGlowClass, LevelsTicker, isLevelsUser } from "./levels-ticker"

const navLinks = [
  { label: "INICIO", href: "#inicio" },
  { label: "SIMULADOR", href: "#simulador" },
  { label: "CÓMO FUNCIONA", href: "#como-funciona" },
  { label: "CONTACTO", href: "#contacto" },
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

  const { data } = useSWR(user && isLevelsUser(user.telefono) ? "/api/my-loans" : null, (url) => fetch(url).then((res) => res.json()))
  const levelInfo = data?.levelInfo

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
          <CunaguaroLogo className="h-9 w-9" />
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            RESUELVE<span className="text-primary font-extrabold text-[1.05em] inline-block ml-[0.03em] origin-left">YA!</span>
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
              <div className="flex items-center gap-2">
                {levelInfo && (
                  <div className={`relative w-6.5 h-6.5 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${getLevelGlowClass(levelInfo.level)}`} title={`${levelInfo.animalName} (Nivel ${levelInfo.level})`}>
                    <img
                      src={levelInfo.badgeUrl}
                      alt={levelInfo.animalName}
                      className="w-4.5 h-4.5 object-contain"
                    />
                  </div>
                )}
                <span className="text-xs font-semibold text-foreground uppercase">
                  Hola, {user.nombres}
                </span>
              </div>
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
              <div className="flex items-center gap-2 px-3">
                {levelInfo && isLevelsUser(user.telefono) && (
                  <div className={`relative w-6 h-6 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${getLevelGlowClass(levelInfo.level)}`}>
                    <img
                      src={levelInfo.badgeUrl}
                      alt={levelInfo.animalName}
                      className="w-4.5 h-4.5 object-contain"
                    />
                  </div>
                )}
                <span className="text-xs font-semibold text-foreground uppercase">
                  HOLA, {user.nombres}
                </span>
                {levelInfo && isLevelsUser(user.telefono) && (
                  <span className="text-[10px] text-primary font-extrabold tracking-wider uppercase ml-1">
                    ({levelInfo.animalName})
                  </span>
                )}
              </div>
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
