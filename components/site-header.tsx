"use client"

import { useState, useEffect } from "react"
import { Menu, X, Copy, Check, ShieldAlert, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { CunaguaroLogo } from "./cunaguaro-logo"
import useSWR from "swr"
import { getLevelGlowClass } from "./levels-ticker"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

const navLinks = [
  { label: "INICIO", href: "#inicio" },
  { label: "SIMULADOR", href: "#simulador" },
  { label: "CÓMO FUNCIONA", href: "#como-funciona" },
  { label: "CONTACTO", href: "#contacto" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ nombres: string; apellidos: string; telefono: string } | null>(null)

  // Admin help states
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [clientPhone, setClientPhone] = useState("")
  const [generatedLink, setGeneratedLink] = useState("")
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isAdmin = user && (user.telefono.replace(/\D/g, "").slice(-10) === "4125654081")

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkError(null)
    setGeneratedLink("")
    setCopied(false)

    // Basic validation
    const digits = clientPhone.replace(/\D/g, "")
    if (digits.length < 10) {
      setLinkError("Por favor ingresa un número de teléfono válido de 7 dígitos.")
      return
    }

    setLinkLoading(true)

    try {
      const res = await fetch("/api/auth/generate-reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: clientPhone }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Error al generar el enlace.")
      }

      setGeneratedLink(data.link)
      setClientPhone("")
    } catch (err: any) {
      setLinkError(err.message || "Ocurrió un error inesperado.")
    } finally {
      setLinkLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

  const { data } = useSWR(user ? "/api/my-loans" : null, (url) => fetch(url).then((res) => res.json()))
  const levelInfo = data?.levelInfo

  useEffect(() => {
    if (data?.user && user) {
      const updatedVerificado = data.user.verificado
      const updatedMotivo = data.user.verificacionMotivo

      if (user.verificado !== updatedVerificado || user.verificacionMotivo !== updatedMotivo) {
        const updatedUser = {
          ...user,
          verificado: updatedVerificado,
          verificacionMotivo: updatedMotivo,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)
        window.dispatchEvent(new Event("auth-change"))
      }
    }
  }, [data, user])

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
              {isAdmin && (
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="rounded-md border border-primary text-primary px-4 py-2 text-xs font-semibold tracking-widest hover:bg-primary/10 transition-colors uppercase animate-pulse"
                >
                  AYUDA AL CLIENTE
                </button>
              )}
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

          {isAdmin && (
            <button
              onClick={() => {
                setOpen(false)
                setIsAdminModalOpen(true)
              }}
              className="w-full text-left rounded-md px-3 py-3 text-sm font-semibold tracking-wide text-primary hover:bg-secondary uppercase animate-pulse"
            >
              AYUDA AL CLIENTE
            </button>
          )}

          {user ? (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 px-3">
                {levelInfo && (
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
                {levelInfo && (
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

      {/* Admin Help Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl relative shadow-2xl">
            <button
              onClick={() => {
                setIsAdminModalOpen(false)
                setGeneratedLink("")
                setLinkError(null)
                setClientPhone("")
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 text-primary mb-4">
              <KeyRound className="h-5 w-5" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                Ayuda al Cliente (Admin)
              </h3>
            </div>

            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Ingresa el número de teléfono del cliente para generar un enlace único de restablecimiento de contraseña. El enlace se inhabilitará automáticamente una vez sea utilizado.
            </p>

            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-phone">Número de Teléfono del Cliente</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  placeholder="Ej. 0412-1234567"
                  value={clientPhone}
                  onChange={(e) => {
                    const value = e.target.value
                    const digits = value.replace(/\D/g, "")
                    if (digits.length <= 4) {
                      setClientPhone(digits)
                    } else {
                      setClientPhone(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
                    }
                  }}
                  required
                  disabled={linkLoading}
                  maxLength={12}
                />
              </div>

              {linkError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{linkError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={linkLoading}
                className="w-full rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {linkLoading ? "GENERANDO..." : "GENERAR ENLACE"}
              </button>
            </form>

            {generatedLink && (
              <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <Label className="text-[10px] tracking-wider text-primary uppercase font-bold block mb-2">
                  Enlace Generado Exitosamente:
                </Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-zinc-950 border border-border px-3 py-2 text-xs rounded-lg text-muted-foreground select-all outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="h-9 w-9 flex items-center justify-center shrink-0 border border-border rounded-lg bg-card hover:bg-secondary transition-colors text-foreground"
                    title="Copiar Enlace"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-500 font-semibold mt-2">
                    ✓ ¡Enlace copiado al portapapeles! Listo para enviar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
