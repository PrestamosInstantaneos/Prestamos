"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Send, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollReveal } from "./scroll-reveal"

interface FAQItem {
  id: string
  question: string
  answer: string
  isResetQuestion?: boolean
}

const faqData: FAQItem[] = [
  {
    id: "forgot-password",
    question: "¿Qué pasa si olvidé mi contraseña?",
    answer: "Si olvidaste tu contraseña, no te preocupes. Puedes solicitar la recuperación de tu cuenta de forma manual. Presiona el botón '(RESOLVER)' a continuación para enviarnos una solicitud de restablecimiento y nos pondremos en contacto contigo de inmediato a través de WhatsApp.",
    isResetQuestion: true
  },
  {
    id: "requirements",
    question: "¿Cuáles son los requisitos para solicitar un préstamo?",
    answer: "Los requisitos son sumamente sencillos: ser mayor de edad, residir en Venezuela, tener una cédula de identidad vigente (la cual se verificará mediante una foto) y un número de teléfono celular activo."
  },
  {
    id: "approval-time",
    question: "¿Cuánto tiempo tarda en aprobarse mi solicitud?",
    answer: "Una vez que envíes tu solicitud de préstamo, nuestro equipo revisará y validará tus datos de forma manual o automática. El proceso suele demorar entre unos minutos y un máximo de 2 horas."
  },
  {
    id: "levels-info",
    question: "¿Cómo subo de nivel y cuáles son los beneficios?",
    answer: "Cada préstamo que pagas de manera puntual acumula historial crediticio positivo en tu cuenta. Esto te permite subir de nivel (desde el nivel 1 'Caracol' hasta el nivel 9 'Jaguar'). Al subir de nivel, incrementas tu límite de préstamo automático y obtienes descuentos especiales de interés de hasta el 40%."
  }
]

export function FAQSection() {
  const [openId, setOpenId] = useState<string | null>(null)
  
  // States for password resolution form
  const [showResolver, setShowResolver] = useState(false)
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 4) {
      setPhone(digits)
    } else {
      setPhone(`${digits.slice(0, 4)}-${digits.slice(4, 11)}`)
    }
  }

  const validatePhone = (p: string): boolean => {
    const cleaned = p.replace(/-/g, "")
    return /^(0412|0422|0414|0424|0416|0426)\d{7}$/.test(cleaned)
  }

  const handleSendResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validatePhone(phone)) {
      setError("Por favor ingresa un número de teléfono de Venezuela válido (0412, 0422, 0414, 0424, 0416, 0426) de 7 dígitos.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: phone })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Error al enviar la solicitud.")
      }

      setSuccess(true)
      setPhone("")
    } catch (err: any) {
      setError(err.message || "Ocurrió un error. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="preguntas-frecuentes" className="relative py-24 px-4 sm:px-6 lg:px-10 overflow-hidden border-t border-border">
      {/* Glow Effect */}
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_60%)]" />

      <div className="mx-auto max-w-4xl relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Preguntas <span className="text-primary">Frecuentes</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Todo lo que necesitas saber sobre nuestra plataforma y cómo resolver tus dudas al instante.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openId === item.id
            return (
              <ScrollReveal key={item.id} delay={index * 100}>
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => {
                      setOpenId(isOpen ? null : item.id)
                      // Reset states if closing or switching questions
                      if (item.isResetQuestion) {
                        setShowResolver(false)
                        setSuccess(false)
                        setError(null)
                      }
                    }}
                    className="w-full flex items-center justify-between px-6 py-5 text-left text-foreground hover:bg-secondary/20 transition-colors"
                  >
                    <span className="font-semibold text-sm sm:text-base flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                      {item.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[800px] border-t border-border" : "max-h-0"
                    }`}
                  >
                    <div className="px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                      <p className="mb-4">{item.answer}</p>
                      
                      {item.isResetQuestion && (
                        <div className="mt-4">
                          {!showResolver ? (
                            <button
                              onClick={() => setShowResolver(true)}
                              className="rounded-xl bg-primary/10 border border-primary/20 text-primary px-5 py-2.5 text-xs font-semibold tracking-widest hover:bg-primary/20 transition-colors uppercase"
                            >
                              (RESOLVER)
                            </button>
                          ) : (
                            <div className="mt-4 p-5 rounded-xl border border-border bg-zinc-950/40 backdrop-blur-inner max-w-md">
                              {success ? (
                                <div className="flex flex-col items-center text-center space-y-3 py-3 animate-fade-in">
                                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                  <p className="text-xs text-foreground font-semibold">
                                    ¡Solicitud recibida! Ya nos estaremos comunicando con usted.
                                  </p>
                                </div>
                              ) : (
                                <form onSubmit={handleSendResetRequest} className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[11px] font-bold tracking-wider text-foreground uppercase block">
                                      Número de teléfono registrado:
                                    </label>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <Input
                                          type="tel"
                                          placeholder="Ej. 0412-1234567"
                                          maxLength={12}
                                          value={phone}
                                          onChange={(e) => handlePhoneChange(e.target.value)}
                                          required
                                          disabled={loading}
                                          className="h-10 text-xs text-foreground"
                                        />
                                      </div>
                                      <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-lg bg-primary text-primary-foreground px-4 flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
                                      >
                                        <Send className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {error && (
                                    <p className="text-[10px] text-destructive font-medium leading-normal animate-pulse">
                                      ⚠️ {error}
                                    </p>
                                  )}
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
