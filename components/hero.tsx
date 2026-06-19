"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { getLevelGlowClass } from "./levels-ticker"
import { ScrollReveal } from "./scroll-reveal"

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

  const { data } = useSWR(user ? "/api/my-loans" : null, (url) => fetch(url).then((res) => res.json()))
  const levelInfo = data?.levelInfo

  // Helper para normalizar/limpiar números de teléfono y cédula
  const cleanPhone = (phone: string) => phone ? phone.replace(/\D/g, "") : ""
  const cleanCedula = (cedula: string) => cedula ? cedula.replace(/\D/g, "") : ""
  
  // Usuario especial: teléfono termina en "4241301804" y cédula es "31758835"
  const isSpecialUser = !!(
    user &&
    cleanPhone(user.telefono).endsWith("4241301804") &&
    cleanCedula(user.cedula) === "31758835"
  )

  return (
    <section id="inicio" className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Tapiz de fondo completo (Full-Bleed Cover) */}
      <div className="absolute inset-0 z-0">
        {isSpecialUser ? (
          <video
            src="/hero-special.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.05]"
          />
        ) : (
          <Image
            src="/images/hero-bg-landscape.png"
            alt="Paisaje del Monte Tepuy Roraima al atardecer"
            fill
            priority
            className="object-cover object-center brightness-[0.85] contrast-[1.05]"
          />
        )}
        {/* Degradado para fundir el final de la imagen con el fondo azul índigo oscuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
      </div>

      {/* Contenedor de contenido alineado a la izquierda */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 lg:px-10 lg:pb-24 lg:pt-40">
        <div className="max-w-2xl text-left flex flex-col items-start">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 backdrop-blur-md px-3.5 py-1.5 shadow-lg select-none">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-white uppercase drop-shadow-sm">
              PRÉSTAMOS 100% FLEXIBLES
            </span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-2xl text-balance sm:text-6xl lg:text-7xl">
            {user ? (
              <>
                ¡Bienvenido,
                <br />
                <span className="text-[#ea580c] font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">{user.nombres.split(" ")[0]} {user.apellidos.split(" ")[0]}</span>!
              </>
            ) : (
              <>
                Tu préstamo,
                <br />
                al instante
              </>
            )}
          </h1>

          {user && levelInfo && (
            <div id="tour-nivel" className="mt-5 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3 shadow-xl select-none animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={`relative w-11 h-11 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${getLevelGlowClass(levelInfo.level)}`}>
                <Image
                  src={levelInfo.badgeUrl}
                  alt={levelInfo.animalName}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Nivel de Socio</p>
                <h3 className="text-sm font-extrabold text-white font-heading tracking-wide flex items-center gap-1.5 leading-none">
                  {levelInfo.animalName}
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    levelInfo.level >= 8 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : 
                    levelInfo.level >= 6 ? "bg-lime-500/20 text-lime-400 border border-lime-500/30" : 
                    levelInfo.level >= 4 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : 
                    "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  }`}>
                    Nivel {levelInfo.level}
                  </span>
                </h3>
              </div>
            </div>
          )}
          {!user && (
            <ScrollReveal>
              <p className="mt-6 max-w-md text-sm sm:text-base leading-relaxed text-slate-200 drop-shadow-md">
                Solicita el dinero que necesitas en minutos. Aprobación rápida, tasas competitivas y desembolso directo a tu cuenta sin papeleo interminable.
              </p>
            </ScrollReveal>
          )}

          <div className="mt-9 flex flex-wrap items-center justify-start gap-4">
            {!user && (
              <button
                onClick={() => {
                  const event = new CustomEvent("open-roadmap")
                  window.dispatchEvent(event)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-sm font-semibold tracking-widest text-primary-foreground transition-all hover:scale-[1.02] active:scale-98 shadow-lg uppercase"
              >
                Cómo funciona a detalle
              </button>
            )}
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
