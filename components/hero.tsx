"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"

export function Hero() {
  const [user, setUser] = useState<any | null>(null)

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

  return (
    <section id="inicio" className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Tapiz de fondo completo (Full-Bleed Cover) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-bg-landscape.png"
          alt="Paisaje del Monte Tepuy Roraima al atardecer"
          fill
          priority
          className="object-cover object-center brightness-[0.85] contrast-[1.05]"
        />
        {/* Degradado para fundir el final de la imagen con el fondo azul índigo oscuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
      </div>

      {/* Contenedor de contenido alineado a la izquierda */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 lg:px-10 lg:pb-24 lg:pt-40">
        <div className="max-w-2xl text-left flex flex-col items-start">
          <p className="mb-4 text-xs font-bold tracking-[0.3em] text-primary drop-shadow-md">
            PRÉSTAMOS 100% FLEXIBLES
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-2xl text-balance sm:text-6xl lg:text-7xl">
            {user ? (
              <>
                ¡Bienvenido,
                <br />
                <span className="text-primary">{user.nombres.split(" ")[0]} {user.apellidos.split(" ")[0]}</span>!
              </>
            ) : (
              <>
                Tu préstamo,
                <br />
                al instante
              </>
            )}
          </h1>
          <p className="mt-6 max-w-md text-sm sm:text-base leading-relaxed text-slate-200 drop-shadow-md">
            {user
              ? "Tu cuenta está activa y lista para solicitar. Utiliza nuestro simulador abajo para configurar tu préstamo y recibir aprobación al instante."
              : "Solicita el dinero que necesitas en minutos. Aprobación rápida, tasas competitivas y desembolso directo a tu cuenta sin papeleo interminable."}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-start gap-4">
            <a
              href="#solicitar"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-sm font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 shadow-lg"
            >
              SOLICITAR AHORA
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#simulador"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-black/25 backdrop-blur-sm px-8 py-4 text-sm font-semibold tracking-widest text-white transition-colors hover:bg-white/10 shadow-lg"
            >
              SIMULAR CUOTA
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
