"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CunaguaroLogo } from "@/components/cunaguaro-logo"

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [phone, setPhone] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setErrorMessage("El token de restablecimiento es requerido.")
      setIsValidating(false)
      return
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await res.json()
        if (res.ok && data.valid) {
          setTokenValid(true)
          setPhone(data.telefono)
        } else {
          setTokenValid(false)
          setErrorMessage(data.message || "Este enlace de restablecimiento es inválido o ya ha sido utilizado.")
        }
      } catch (err) {
        console.error(err)
        setTokenValid(false)
        setErrorMessage("Error de conexión al verificar el token.")
      } finally {
        setIsValidating(false)
      }
    }

    checkToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (newPassword.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Error al actualizar la contraseña.")
      }

      setSuccess(true)
    } catch (err: any) {
      setFormError(err.message || "Error al restablecer la contraseña. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Verificando enlace de seguridad...</p>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/15 text-destructive mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Enlace Inválido</h3>
        <p className="text-sm text-muted-foreground px-4 mb-8 leading-relaxed">
          {errorMessage}
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-md border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Volver al Inicio
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-500 mb-4 animate-bounce">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">¡Contraseña Cambiada!</h3>
        <p className="text-sm text-muted-foreground px-4 mb-8 leading-relaxed">
          Tu contraseña ha sido actualizada exitosamente. Ahora puedes ingresar a tu cuenta con tus nuevas credenciales.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-md bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Iniciar Sesión
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs text-primary mb-4">
        Restableciendo contraseña para el usuario: <strong className="font-bold">{phone}</strong>
      </div>

      {formError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva Contraseña</Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="newPassword"
            type="password"
            placeholder="Mínimo 6 caracteres"
            className="pl-10"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repite la contraseña"
            className="pl-10"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3.5 text-sm font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
      >
        {loading ? "ACTUALIZANDO..." : "CAMBIAR CONTRASEÑA"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center py-12 px-6 lg:px-10 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Top logo & back button */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 z-10">
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:text-foreground uppercase"
        >
          <ArrowLeft className="h-4 w-4" /> Ir al Login
        </button>

        <div className="flex items-center gap-2">
          <CunaguaroLogo className="h-8 w-8" />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            RESUELVE<span className="text-primary font-extrabold text-[1.05em] inline-block ml-[0.03em] origin-left">YA!</span>
          </span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 backdrop-blur p-8 z-10 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Elige una contraseña segura para restablecer tu acceso
          </p>
        </div>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        }>
          <ResetPasswordFormContent />
        </Suspense>
      </div>
    </div>
  )
}
