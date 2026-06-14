"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock, Phone, X, FileText, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"

import { CunaguaroLogo } from "@/components/cunaguaro-logo"
import { Label } from "@/components/ui/label"

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        const MAX_SIZE = 1200
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.75))
        } else {
          resolve(event.target?.result as string)
        }
      }
      img.onerror = () => {
        resolve(event.target?.result as string)
      }
    }
    reader.onerror = () => {
      resolve("")
    }
  })
}

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paso del formulario de registro (1 o 2)
  const [step, setStep] = useState(1)

  // Login Form States
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register Form States - PASO 1
  const [regNombres, setRegNombres] = useState("")
  const [regApellidos, setRegApellidos] = useState("")
  const [regCedula, setRegCedula] = useState("V-")
  const [regPhone, setRegPhone] = useState("")
  const [regProfesion, setRegProfesion] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regTrabajando, setRegTrabajando] = useState("Sí") // Sí o No

  // Días de cobro options
  const [diasCobroOption, setDiasCobroOption] = useState("Quincenal")
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  // Register Form States - PASO 2
  const [regCiudad, setRegCiudad] = useState("")
  const [regMunicipio, setRegMunicipio] = useState("")
  const [regCalle, setRegCalle] = useState("")
  const [regRefPhone, setRegRefPhone] = useState("")
  const [regRefRelacion, setRegRefRelacion] = useState("Familiar")
  const [regCedulaPhoto, setRegCedulaPhoto] = useState<string | null>(null)
  const [regTerms, setRegTerms] = useState(false)
  const [showExamplePhoto, setShowExamplePhoto] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [regRostroPhoto, setRegRostroPhoto] = useState<string | null>(null)
  const [showExampleRostro, setShowExampleRostro] = useState(false)

  // Check if already logged in
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          router.push("/")
        }
      } catch (err) {
        console.error(err)
      }
    }
    checkSession()
  }, [router])

  const handleCedulaChange = (value: string) => {
    let cleaned = value.replace(/^V-?/i, "")
    cleaned = cleaned.replace(/[^\d]/g, "")
    setRegCedula("V-" + cleaned)
  }

  const handlePhoneChange = (value: string, setter: (val: string) => void) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 4) {
      setter(digits)
    } else {
      setter(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
    }
  }

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day))
    } else {
      if (selectedDays.length < 2) {
        setSelectedDays([...selectedDays, day].sort((a, b) => a - b))
      } else {
        setSelectedDays([selectedDays[1], day].sort((a, b) => a - b))
      }
    }
  }

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/-/g, "")
    return /^(0412|0414|0424|0416|0426)\d{7}$/.test(cleaned)
  }

  const handleRegRefPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 4) {
      setRegRefPhone(digits)
    } else {
      setRegRefPhone(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError("La foto de la cédula no debe exceder los 8MB.")
        return
      }
      try {
        const compressed = await compressImage(file)
        setRegCedulaPhoto(compressed)
      } catch (err) {
        setError("Error al procesar la foto.")
      }
    }
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!regNombres.trim() || !regApellidos.trim() || !regProfesion.trim()) {
      setError("Por favor completa todos los campos requeridos en esta sección.")
      return
    }

    if (regCedula === "V-" || regCedula.length < 3) {
      setError("Por favor ingresa tu número de cédula completo.")
      return
    }

    if (!validatePhone(regPhone)) {
      setError("El número de teléfono debe iniciar con una operadora de Venezuela válida (0412, 0414, 0424, 0416, 0426) seguida de 7 dígitos. Ejemplo: 0412-1234567")
      return
    }

    if (regPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setStep(2)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!validatePhone(loginPhone)) {
      setError("El número de teléfono debe iniciar con una operadora de Venezuela válida (0412, 0414, 0424, 0416, 0426) seguida de 7 dígitos. Ejemplo: 0412-1234567")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: loginPhone,
          contraseña: loginPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Credenciales incorrectas")
      }

      // Guardar el perfil en localStorage para actualizar la UI instantáneamente
      localStorage.setItem("user", JSON.stringify(data.user))
      window.dispatchEvent(new Event("auth-change"))

      router.push("/")
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!regCiudad.trim() || !regMunicipio.trim() || !regCalle.trim() || !regRefPhone.trim()) {
      setError("Por favor ingresa tu dirección de residencia y tu teléfono de referencia.")
      return
    }

    if (!validatePhone(regRefPhone)) {
      setError("El número de teléfono de referencia debe iniciar con una operadora de Venezuela válida (0412, 0414, 0424, 0416, 0426) seguida de 7 dígitos. Ejemplo: 0412-1234567")
      return
    }

    if (!regCedulaPhoto) {
      setError("Por favor sube una foto de tu cédula de identidad.")
      return
    }

    if (!regRostroPhoto) {
      setError("Por favor sube una foto frontal de tu rostro.")
      return
    }

    if (!regTerms) {
      setError("Debes aceptar los términos y condiciones para registrar tu cuenta.")
      return
    }

    let finalDiasCobro = diasCobroOption
    if (diasCobroOption === "Otro...") {
      if (selectedDays.length === 0) {
        setError("Por favor selecciona al menos un día en el calendario de cobro.")
        return
      }
      finalDiasCobro = selectedDays.length === 1 
        ? `Día ${selectedDays[0]}` 
        : `Días ${selectedDays[0]} y ${selectedDays[1]}`
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: regNombres,
          apellidos: regApellidos,
          cedula: regCedula,
          telefono: regPhone,
          profesion: regProfesion,
          diasCobro: finalDiasCobro,
          contraseña: regPassword,
          trabajando: regTrabajando,
          ciudad: regCiudad,
          municipio: regMunicipio,
          calle: regCalle,
          referencias: `${regRefPhone} (${regRefRelacion})`,
          cedulaPhoto: regCedulaPhoto,
          rostroPhoto: regRostroPhoto,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Error al registrarse")
      }

      localStorage.setItem("user", JSON.stringify(data.user))
      window.dispatchEvent(new Event("auth-change"))

      router.push("/")
    } catch (err: any) {
      setError(err.message || "Error al registrarse. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center py-12 px-6 lg:px-10 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Top logo & back button */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 z-10">
        <button
          onClick={() => {
            if (!isLogin && step === 2) {
              setStep(1)
            } else {
              router.push("/")
            }
          }}
          className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:text-foreground uppercase"
        >
          <ArrowLeft className="h-4 w-4" /> {(!isLogin && step === 2) ? "Atrás al paso 1" : "Volver al Inicio"}
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
          <h2 className="font-heading text-2xl font-bold text-foreground">
            {isLogin ? "Iniciar Sesión" : step === 1 ? "Crear una Cuenta (Paso 1/2)" : "Crear una Cuenta (Paso 2/2)"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin
              ? "Accede a tu simulador y gestiona tus préstamos"
              : step === 1
              ? "Registra tus datos de contacto iniciales y de cobro"
              : "Ingresa tus datos de residencia y adjunta tu identificación"}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLogin ? (
          // LOGIN FORM
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Teléfono</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ej. 0412-1234567"
                  className="pl-10"
                  maxLength={12}
                  value={loginPhone}
                  onChange={(e) => handlePhoneChange(e.target.value, setLoginPhone)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
              {loading ? "CARGANDO..." : "INGRESAR"}
            </button>
          </form>
        ) : step === 1 ? (
          // REGISTER FORM - STEP 1
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regNombres">Nombres</Label>
                <Input
                  id="regNombres"
                  placeholder="Ej. Juan Carlos"
                  value={regNombres}
                  onChange={(e) => setRegNombres(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regApellidos">Apellidos</Label>
                <Input
                  id="regApellidos"
                  placeholder="Ej. Pérez"
                  value={regApellidos}
                  onChange={(e) => setRegApellidos(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regCedula">Cédula de Identidad</Label>
              <Input
                id="regCedula"
                value={regCedula}
                onChange={(e) => handleCedulaChange(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regPhone">Número de Teléfono</Label>
              <Input
                id="regPhone"
                type="tel"
                placeholder="Ej. 0412-1234567"
                maxLength={12}
                value={regPhone}
                onChange={(e) => handlePhoneChange(e.target.value, setRegPhone)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regProfesion">Profesión o Cargo</Label>
              <Input
                id="regProfesion"
                placeholder="Ej. Administrador"
                value={regProfesion}
                onChange={(e) => setRegProfesion(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Trabajando check */}
            <div className="space-y-2">
              <Label className="mb-2 block">¿Actualmente te encuentras trabajando?</Label>
              <div className="grid grid-cols-2 gap-3">
                {["Sí", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRegTrabajando(opt)}
                    className={
                      "rounded-md border p-2.5 text-xs font-semibold transition-colors " +
                      (regTrabajando === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground")
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Días de Cobro */}
            <div className="space-y-2">
              <Label className="mb-2 block">Días de cobro</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Quincenal", "Semanal", "Solo último de mes", "Otro..."].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDiasCobroOption(opt)
                      if (opt !== "Otro...") {
                        setSelectedDays([])
                      }
                    }}
                    className={
                      "rounded-md border p-2 text-xs font-medium transition-colors " +
                      (diasCobroOption === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground")
                    }
                  >
                    {opt === "Quincenal" ? "Quincenal" : opt === "Semanal" ? "Semanal" : opt === "Solo último de mes" ? "Fin de Mes" : "Elegir días"}
                  </button>
                ))}
              </div>

              {diasCobroOption === "Otro..." && (
                <div className="mt-3 p-4 rounded-xl border border-border bg-card/40">
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Selecciona 1 o 2 días en los que cobras en el mes:
                  </p>
                  <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isSelected = selectedDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={
                            "h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all " +
                            (isSelected
                              ? "bg-primary text-primary-foreground shadow"
                              : "bg-secondary text-muted-foreground hover:bg-border hover:text-foreground")
                          }
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="text-xs text-primary mt-3 text-center font-medium">
                      Día(s) seleccionado(s): {selectedDays.join(" y ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="regPassword">Crea tu Contraseña</Label>
              <Input
                id="regPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary py-3.5 text-sm font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 flex items-center justify-center gap-2 mt-6"
            >
              SIGUIENTE
            </button>
          </form>
        ) : (
          // REGISTER FORM - STEP 2
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regCiudad">Ciudad</Label>
              <Input
                id="regCiudad"
                placeholder="Ej. Caracas"
                value={regCiudad}
                onChange={(e) => setRegCiudad(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regMunicipio">Municipio</Label>
                <Input
                  id="regMunicipio"
                  placeholder="Ej. Chacao"
                  value={regMunicipio}
                  onChange={(e) => setRegMunicipio(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regCalle">Calle / Av.</Label>
                <Input
                  id="regCalle"
                  placeholder="Ej. Av. Francisco de Miranda"
                  value={regCalle}
                  onChange={(e) => setRegCalle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regRefPhone">Teléfono de Referencia</Label>
                <Input
                  id="regRefPhone"
                  type="tel"
                  placeholder="Ej. 0412-1234567"
                  value={regRefPhone}
                  onChange={(e) => handleRegRefPhoneChange(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regRefRelacion">Relación</Label>
                <select
                  id="regRefRelacion"
                  value={regRefRelacion}
                  onChange={(e) => setRegRefRelacion(e.target.value)}
                  disabled={loading}
                  className="w-full bg-black/45 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground py-2.5 px-3.5 text-sm rounded-xl shadow-inner outline-none transition-colors"
                >
                  <option value="Familiar" className="bg-zinc-950 text-foreground">Familiar</option>
                  <option value="Amigo" className="bg-zinc-950 text-foreground">Amigo</option>
                  <option value="Empleador" className="bg-zinc-950 text-foreground">Empleador</option>
                  <option value="Otro" className="bg-zinc-950 text-foreground">Otro</option>
                </select>
              </div>
            </div>

            {/* Subida de Cédula */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="cedulaFile">Foto de tu Cédula de Identidad</Label>
                <button
                  type="button"
                  onClick={() => setShowExamplePhoto(!showExamplePhoto)}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {showExamplePhoto ? "Ocultar ejemplo" : "Ver foto de ejemplo ↗"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Asegúrate de que la foto sea lo más clara y legible posible, tomada en un lugar bien iluminado, sin brillos ni reflejos, similar a la foto de ejemplo.
              </p>

              {showExamplePhoto && (
                <div className="rounded-lg overflow-hidden border border-border bg-secondary/15 p-2 transition-all duration-300">
                  <img
                    src="/images/cedula-ejemplo.jpg"
                    alt="Ejemplo de Cédula de Identidad"
                    className="w-full max-w-[280px] mx-auto rounded border border-border shadow-md object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-card/40 transition-colors hover:border-primary/50 relative">
                <input
                  id="cedulaFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground text-center">
                  {regCedulaPhoto ? "✓ Foto cargada correctamente" : "Haz clic para subir una foto de tu cédula"}
                </span>
                {regCedulaPhoto && (
                  <span className="mt-2 text-[10px] text-primary font-medium">Reemplazar archivo</span>
                )}
              </div>
            </div>

            {/* Subida de Rostro */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="rostroFile">Foto Frontal de tu Rostro</Label>
                <button
                  type="button"
                  onClick={() => setShowExampleRostro(!showExampleRostro)}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {showExampleRostro ? "Ocultar ejemplo" : "Ver foto de ejemplo ↗"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tómate una foto selfie frontal clara, con buena iluminación, el rostro completamente descubierto, sin gorros, lentes ni accesorios. Debe asemejarse al dibujo ilustrativo de ejemplo.
              </p>

              {showExampleRostro && (
                <div className="rounded-lg overflow-hidden border border-border bg-secondary/15 p-2 transition-all duration-300">
                  <img
                    src="/images/rostro-ejemplo.png"
                    alt="Ejemplo de Foto Frontal del Rostro"
                    className="w-full max-w-[280px] mx-auto rounded border border-border shadow-md object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-card/40 transition-colors hover:border-primary/50 relative">
                <input
                  id="rostroFile"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 8 * 1024 * 1024) {
                        setError("La foto del rostro no debe exceder los 8MB.")
                        return
                      }
                      try {
                        const compressed = await compressImage(file)
                        setRegRostroPhoto(compressed)
                      } catch (err) {
                        setError("Error al procesar la foto.")
                      }
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground text-center">
                  {regRostroPhoto ? "✓ Foto cargada correctamente" : "Haz clic para subir una foto frontal de tu rostro"}
                </span>
                {regRostroPhoto && (
                  <span className="mt-2 text-[10px] text-primary font-medium">Reemplazar archivo</span>
                )}
              </div>
            </div>

            {/* Checkbox de Términos y Condiciones */}
            <div className="flex items-start gap-3 text-xs text-muted-foreground select-none pt-2">
              <input
                id="regTerms"
                type="checkbox"
                checked={regTerms}
                onChange={(e) => setRegTerms(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                required
              />
              <label htmlFor="regTerms" className="cursor-pointer leading-normal">
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="underline text-primary hover:text-primary/80 font-semibold inline-block cursor-pointer"
                >
                  términos y condiciones
                </button>
              </label>
            </div>

            {/* Botones de acción Paso 2 */}
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-1/3 rounded-md border border-border py-3.5 text-xs font-semibold tracking-widest text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                ATRÁS
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 rounded-md bg-primary py-3.5 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "VALIDANDO..." : "CREAR CUENTA"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setStep(1)
                setError(null)
              }}
              className="font-semibold text-primary transition-colors hover:text-foreground"
            >
              {isLogin ? "Regístrate aquí" : "Inicia sesión aquí"}
            </button>
          </p>
        </div>
      </div>

      {/* Modal de Términos y Condiciones */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-foreground flex flex-col max-h-[85vh]">
            
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider">
                  Términos y Condiciones Legales
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido legal con scroll */}
            <div className="flex-1 overflow-y-auto pr-2 text-xs text-muted-foreground space-y-4 leading-relaxed scrollbar-thin">
              <p className="font-semibold text-foreground text-center">
                CONTRATO DE TÉRMINOS Y CONDICIONES DE USO Y SERVICIO
              </p>
              <p>
                Este documento constituye el contrato de Términos y Condiciones que regulan el acceso y uso del sitio web "RESUELVE YA!" y los servicios de simulación y solicitud de créditos comerciales y micro-créditos otorgados bajo el RIF <strong className="text-foreground">J508167368</strong>, en adelante denominado <strong className="text-foreground">"LA EMPRESA"</strong> o <strong className="text-foreground">"EL ADMINISTRADOR"</strong>.
              </p>

              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider pt-2">
                1. OBJETO Y REGISTRO
              </h4>
              <p>
                El usuario declara tener capacidad civil para obligarse y acepta libremente afiliarse para hacer uso de la plataforma de solicitud de micro-préstamos. El registro requiere la veracidad e integridad absoluta de la información ingresada.
              </p>

              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider pt-2">
                2. DERECHO DE SUSPENSIÓN, BLOQUEO Y ELIMINACIÓN DE CUENTAS
              </h4>
              <p>
                <strong className="text-foreground">LA EMPRESA</strong> se reserva el derecho absoluto, unilateral e inapelable de suspender de forma temporal, bloquear de manera indefinida o eliminar definitivamente la cuenta de cualquier usuario, así como anular cualquier solicitud de crédito en curso, si se constatan:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Irregularidades en la autenticación o datos de identidad falsos o dudosos (incluyendo la foto de la cédula cargada).</li>
                <li>Uso indebido o abusivo del servicio (denegación de servicio, bots, escaneos no autorizados, etc.).</li>
                <li>Incumplimiento contractual de los compromisos de pago adquiridos o mora continuada.</li>
                <li>Preceptos legales nacionales vigentes que obliguen a suspender la cuenta para evitar fraudes u operaciones ilícitas.</li>
              </ul>

              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider pt-2">
                3. VERIFICACIÓN LEGAL DE DATOS
              </h4>
              <p>
                Al registrarse, el usuario autoriza expresamente a la verificación, corroboración y auditoría de la información provista, incluyendo la realización de llamadas de verificación a referencias personales y comerciales.
              </p>

              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider pt-2">
                4. INFORMACIÓN CORPORATIVA Y DE CONTACTO
              </h4>
              <p>
                Para respaldar la transparencia comercial y legal de las operaciones, la validez del RIF <strong className="text-foreground">J508167368</strong> puede ser consultada y verificada de manera pública y oficial por cualquier interesado a través del portal oficial del <strong className="text-foreground">SENIAT</strong> (Servicio Nacional Integrado de Administración Aduanera y Tributaria) en su sitio web <a href="http://www.seniat.gob.ve" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">www.seniat.gob.ve</a> utilizando la opción de "Consulta Comprobante Digital RIF".
              </p>

              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider pt-2">
                5. DOMICILIO ESPECIAL Y JURISDICCIÓN
              </h4>
              <p>
                Para todos los efectos derivados de estos términos, se elige como domicilio exclusivo y excluyente a la ciudad de Guatire - Guarenas, Estado Miranda, sometiéndose expresamente a la jurisdicción de sus tribunales competentes.
              </p>
            </div>

            {/* Footer del modal */}
            <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegTerms(true)
                  setIsTermsModalOpen(false)
                }}
                className="px-4 py-2 bg-primary hover:opacity-90 text-xs font-bold text-primary-foreground rounded-lg transition-opacity cursor-pointer"
              >
                Aceptar y Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
