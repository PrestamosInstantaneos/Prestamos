"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
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

export function LoanApplication() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{
    nombres: string;
    apellidos: string;
    cedula: string;
    telefono: string;
    profesion: string;
    diasCobro: string;
    trabajando?: string;
    ciudad?: string;
    municipio?: string;
    calle?: string;
    referencias?: string;
    driveLink?: string;
  } | null>(null)

  // Paso del formulario de registro (1 o 2)
  const [step, setStep] = useState(1)

  // Estados para re-verificación de cédula
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [newCedulaPhoto, setNewCedulaPhoto] = useState<string | null>(null)
  const [showReverifyForm, setShowReverifyForm] = useState(false)
  const [showExamplePhoto, setShowExamplePhoto] = useState(false)

  // Campos del formulario - PASO 1
  const [nombres, setNombres] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [cedula, setCedula] = useState("V-")
  const [telefono, setTelefono] = useState("")
  const [profesion, setProfesion] = useState("")
  const [contraseñea, setContraseña] = useState("")
  const [trabajando, setTrabajando] = useState("Sí") // Sí o No

  // Días de cobro options
  const [diasCobroOption, setDiasCobroOption] = useState("Quincenal")
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  // Campos del formulario - PASO 2
  const [ciudad, setCiudad] = useState("")
  const [municipio, setMunicipio] = useState("")
  const [calle, setCalle] = useState("")
  const [refPhone, setRefPhone] = useState("")
  const [refRelacion, setRefRelacion] = useState("Familiar")
  const [cedulaPhoto, setCedulaPhoto] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)

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

  const handleCedulaChange = (value: string) => {
    let cleaned = value.replace(/^V-?/i, "")
    cleaned = cleaned.replace(/[^\d]/g, "")
    setCedula("V-" + cleaned)
  }

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 4) {
      setTelefono(digits)
    } else {
      setTelefono(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
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

  const handleRefPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 4) {
      setRefPhone(digits)
    } else {
      setRefPhone(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
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
        setCedulaPhoto(compressed)
      } catch (err) {
        setError("Error al procesar la foto.")
      }
    }
  }

  const handleNewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setVerificationError("La foto de la cédula no debe exceder los 8MB.")
        return
      }
      try {
        const compressed = await compressImage(file)
        setNewCedulaPhoto(compressed)
      } catch (err) {
        setVerificationError("Error al procesar la foto.")
      }
    }
  }

  const handleReverifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCedulaPhoto) {
      setVerificationError("Por favor selecciona una foto de tu cédula.")
      return
    }

    setVerificationLoading(true)
    setVerificationError(null)

    try {
      const res = await fetch("/api/auth/verify-cedula", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cedulaPhoto: newCedulaPhoto,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Error al realizar la verificación.")
      }

      // Guardar el perfil actualizado en localStorage
      localStorage.setItem("user", JSON.stringify(data.user))
      window.dispatchEvent(new Event("auth-change"))

      // Limpiar estados
      setNewCedulaPhoto(null)
      setShowReverifyForm(false)
      setVerificationError(null)
    } catch (err: any) {
      console.error(err)
      setVerificationError(err.message || "La verificación falló. Por favor intenta de nuevo.")
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombres.trim() || !apellidos.trim() || !profesion.trim()) {
      setError("Por favor completa todos los campos requeridos en esta sección.")
      return
    }

    if (cedula === "V-" || cedula.length < 3) {
      setError("Por favor ingresa tu número de cédula completo.")
      return
    }

    if (!validatePhone(telefono)) {
      setError("El número de teléfono debe iniciar con una operadora de Venezuela válida (0412, 0414, 0424, 0416, 0426) seguida de 7 dígitos. Ejemplo: 0412-1234567")
      return
    }

    if (contraseñea.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!ciudad.trim() || !municipio.trim() || !calle.trim() || !refPhone.trim()) {
      setError("Por favor ingresa tu dirección de residencia y tu teléfono de referencia.")
      return
    }

    if (!validatePhone(refPhone)) {
      setError("El número de teléfono de referencia debe iniciar con una operadora de Venezuela válida (0412, 0414, 0424, 0416, 0426) seguida de 7 dígitos. Ejemplo: 0412-1234567")
      return
    }

    if (!cedulaPhoto) {
      setError("Por favor sube una foto de tu cédula de identidad.")
      return
    }

    if (!terms) {
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
      if (user) return // El usuario ya está logueado, no requiere registrarse otra vez

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombres,
          apellidos,
          cedula,
          telefono,
          profesion,
          diasCobro: finalDiasCobro,
          contraseña: contraseñea,
          trabajando,
          ciudad,
          municipio,
          calle,
          referencias: `${refPhone} (${refRelacion})`,
          cedulaPhoto,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || "Error al enviar la solicitud")
      }

      // Guardar el perfil en localStorage para actualizar la UI instantáneamente
      localStorage.setItem("user", JSON.stringify(data.user))
      window.dispatchEvent(new Event("auth-change"))

      setSubmitted(true)
      // Limpiar formulario
      setNombres("")
      setApellidos("")
      setCedula("V-")
      setTelefono("")
      setProfesion("")
      setContraseña("")
      setSelectedDays([])
      setDiasCobroOption("Quincenal")
      setTrabajando("Sí")
      setCiudad("")
      setMunicipio("")
      setCalle("")
      setRefPhone("")
      setRefRelacion("Familiar")
      setCedulaPhoto(null)
      setTerms(false)
      setStep(1)
    } catch (err: any) {
      console.error("Error al enviar solicitud:", err)
      setError(err.message || "Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="solicitar" className="border-t border-border py-12 md:py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10">
        <div className="text-center">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-primary">
            SOLICITUD EN LÍNEA
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl md:text-4xl">
            {user 
              ? "Tu Solicitud de Préstamo" 
              : step === 1 
              ? "Regístrate y solicita tu préstamo (Paso 1/2)" 
              : "Regístrate y solicita tu préstamo (Paso 2/2)"}
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground text-pretty">
            {user 
              ? "Tu cuenta está activa y los datos de tu perfil han sido registrados exitosamente en nuestra base de datos."
              : step === 1
              ? "Completa el formulario para crear tu cuenta de usuario e iniciar el proceso de evaluación de préstamo."
              : "Ingresa tus datos de residencia y adjunta tu identificación para completar tu registro."}
          </p>
        </div>

        <div className="mt-8 md:mt-12 rounded-2xl border border-border bg-card p-5 sm:p-8 lg:p-10">
          {user ? (
            // VISTA CUANDO EL USUARIO ESTÁ LOGUEADO
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </span>
              <h3 className="font-heading text-2xl font-bold text-card-foreground">
                ¡Cuenta Activa y Solicitud Registrada!
              </h3>
              
              <div className="mt-8 w-full max-w-md rounded-xl border border-border bg-secondary/20 p-6 text-left space-y-3 text-sm">
                <h4 className="font-heading font-semibold text-foreground border-b border-border pb-2">Resumen del Perfil Registrado</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cédula:</span>
                  <span className="font-medium text-foreground">{user.cedula}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="font-medium text-foreground">{user.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profesión:</span>
                  <span className="font-medium text-foreground">{user.profesion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días de cobro:</span>
                  <span className="font-medium text-foreground">{user.diasCobro}</span>
                </div>
                {user.trabajando && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">¿Trabajando actualmente?:</span>
                    <span className="font-medium text-foreground">{user.trabajando}</span>
                  </div>
                )}
                {user.ciudad && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ciudad:</span>
                    <span className="font-medium text-foreground">{user.ciudad}</span>
                  </div>
                )}
                {user.municipio && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Municipio:</span>
                    <span className="font-medium text-foreground">{user.municipio}</span>
                  </div>
                )}
                {user.calle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calle:</span>
                    <span className="font-medium text-foreground">{user.calle}</span>
                  </div>
                )}
                {user.referencias && (
                  <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                    <span className="text-muted-foreground">Referencias:</span>
                    <span className="font-medium text-foreground text-right max-w-[200px] break-words">{user.referencias}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground font-medium">Estado de Verificación:</span>
                  {user.verificado === "VERIFICADA" ? (
                    <span className="font-semibold text-emerald-500">
                      VERIFICADA ✓
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-500">
                      NO VERIFICADA ⚠
                    </span>
                  )}
                </div>
                {user.verificado !== "VERIFICADA" && user.verificacionMotivo && (
                  <div className="text-[11px] leading-relaxed text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded p-2.5 mt-2 whitespace-pre-wrap">
                    <strong>Motivo:</strong>{"\n"}{user.verificacionMotivo}
                  </div>
                )}
              </div>

              {/* Formulario de re-verificación para cuentas no verificadas */}
              {user.verificado !== "VERIFICADA" && (
                <div className="mt-8 w-full max-w-md text-left">
                  {!showReverifyForm ? (
                    <button
                      onClick={() => setShowReverifyForm(true)}
                      className="w-full rounded-md bg-primary py-3 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      VERIFICAR CUENTA AHORA
                    </button>
                  ) : (
                    <form onSubmit={handleReverifySubmit} className="space-y-4 rounded-xl border border-amber-500/20 bg-card/40 p-6">
                      <h5 className="font-heading font-semibold text-sm text-foreground flex justify-between items-center">
                        <span>Sube una nueva foto de tu cédula</span>
                        <button
                          type="button"
                          onClick={() => setShowExamplePhoto(!showExamplePhoto)}
                          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 font-sans"
                        >
                          {showExamplePhoto ? "Ocultar ejemplo" : "Ver foto de ejemplo ↗"}
                        </button>
                      </h5>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Asegúrate de que la foto sea lo más clara y legible posible, tomada en un lugar bien iluminado, sin brillos ni reflejos, similar al ejemplo. El sistema validará que los datos coincidan y cumplan con las reglas de autenticidad.
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

                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-5 bg-card/60 transition-colors hover:border-primary/50 relative">
                        <input
                          id="newCedulaFile"
                          type="file"
                          accept="image/*"
                          onChange={handleNewFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={verificationLoading}
                        />
                        <span className="text-xs text-muted-foreground text-center">
                          {newCedulaPhoto ? "✓ Foto cargada correctamente" : "Haz clic para seleccionar nueva foto"}
                        </span>
                        {newCedulaPhoto && (
                          <span className="mt-2 text-[10px] text-primary font-medium">Reemplazar archivo</span>
                        )}
                      </div>

                      {verificationError && (
                        <p className="text-xs text-red-500 font-medium">{verificationError}</p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowReverifyForm(false)
                            setVerificationError(null)
                            setNewCedulaPhoto(null)
                          }}
                          disabled={verificationLoading}
                          className="w-1/3 rounded-md border border-border py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                        >
                          CANCELAR
                        </button>
                        <button
                          type="submit"
                          disabled={verificationLoading || !newCedulaPhoto}
                          className="w-2/3 rounded-md bg-primary py-2.5 text-xs font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {verificationLoading ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                              VALIDANDO...
                            </>
                          ) : (
                            "VERIFICAR"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : submitted ? (
            // VISTA CUANDO ACABA DE REGISTRARSE EXITOSAMENTE
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </span>
              <h3 className="font-heading text-2xl font-bold text-card-foreground">
                ¡Registro completado!
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Tu usuario ha sido creado y guardado en Google Sheets.
                Hemos recibido tu solicitud de préstamo de forma exitosa.
                Nuestro equipo la revisará y te contactará en breve.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-8 rounded-md border border-border px-6 py-3 text-sm font-semibold tracking-widest text-foreground transition-colors hover:bg-secondary"
              >
                ENTENDIDO
              </button>
            </div>
          ) : step === 1 ? (
            // FORMULARIO DE REGISTRO - PASO 1
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    placeholder="Ej. Juan Carlos"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    placeholder="Ej. Pérez Gómez"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula de Identidad</Label>
                  <Input
                    id="cedula"
                    value={cedula}
                    onChange={(e) => handleCedulaChange(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="Ej. 0412-1234567"
                    maxLength={12}
                    value={telefono}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profesion">Profesión</Label>
                  <Input
                    id="profesion"
                    placeholder="Ej. Administrador, Comerciante"
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Trabajando check */}
                <div className="space-y-2 sm:col-span-2">
                  <Label className="mb-2 block">¿Actualmente te encuentras trabajando?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Sí", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTrabajando(opt)}
                        className={
                          "rounded-md border p-2.5 text-xs font-semibold transition-colors " +
                          (trabajando === opt
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
                <div className="space-y-2 sm:col-span-2">
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

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contraseñea">Contraseña para tu cuenta</Label>
                  <Input
                    id="contraseñea"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={contraseñea}
                    onChange={(e) => setContraseña(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary py-3 sm:py-4 text-xs sm:text-sm font-semibold tracking-wide sm:tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                SIGUIENTE
              </button>
            </form>
          ) : (
            // FORMULARIO DE REGISTRO - PASO 2
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    placeholder="Ej. Caracas"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio</Label>
                  <Input
                    id="municipio"
                    placeholder="Ej. Chacao"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calle">Calle / Av.</Label>
                  <Input
                    id="calle"
                    placeholder="Ej. Av. Francisco de Miranda"
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="refPhone">Teléfono de Referencia</Label>
                  <Input
                    id="refPhone"
                    type="tel"
                    placeholder="Ej. 0412-1234567"
                    value={refPhone}
                    onChange={(e) => handleRefPhoneChange(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="refRelacion">Relación</Label>
                  <select
                    id="refRelacion"
                    value={refRelacion}
                    onChange={(e) => setRefRelacion(e.target.value)}
                    disabled={loading}
                    className="w-full bg-black/45 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground py-2.5 px-3.5 text-sm rounded-xl shadow-inner outline-none transition-colors"
                  >
                    <option value="Familiar" className="bg-zinc-950 text-foreground">Familiar</option>
                    <option value="Amigo" className="bg-zinc-950 text-foreground">Amigo</option>
                    <option value="Empleador" className="bg-zinc-950 text-foreground">Empleador</option>
                    <option value="Otro" className="bg-zinc-950 text-foreground">Otro</option>
                  </select>
                </div>

                {/* Subida de Cédula */}
                <div className="space-y-2.5 sm:col-span-2">
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
                      {cedulaPhoto ? "✓ Foto cargada correctamente" : "Haz clic para subir una foto de tu cédula"}
                    </span>
                    {cedulaPhoto && (
                      <span className="mt-2 text-[10px] text-primary font-medium">Reemplazar archivo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkbox de Términos y Condiciones */}
              <label className="flex items-start gap-3 text-sm text-muted-foreground select-none cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                  required
                />
                <span>
                  Acepto los términos y condiciones y autorizo la verificación de mis datos.
                </span>
              </label>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Botones de acción Paso 2 */}
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-1/3 rounded-md border border-border py-3 sm:py-4 text-xs sm:text-sm font-semibold tracking-wide sm:tracking-widest text-foreground transition-colors hover:bg-secondary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> ATRÁS
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 rounded-md bg-primary py-3 sm:py-4 text-xs sm:text-sm font-semibold tracking-wide sm:tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      VALIDANDO...
                    </>
                  ) : (
                    "ENVIAR SOLICITUD"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

