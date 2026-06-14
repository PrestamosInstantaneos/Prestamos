"use client"

import { useEffect, useRef, useState, ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
}

export function ScrollReveal({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hacemos que aparezca y desaparezca dinámicamente según subes o bajas
        setIsVisible(entry.isIntersecting)
      },
      {
        threshold: 0.1, // Se activa cuando el 10% es visible
        rootMargin: "-40px 0px -40px 0px" // Dispara el efecto un poco antes/después para que sea suave
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] cubic-bezier(0.16, 1, 0.3, 1) transform ${
        isVisible 
          ? "opacity-100 translate-y-0 scale-100 filter blur-0" 
          : "opacity-0 translate-y-6 scale-97 filter blur-[3px]"
      } ${className}`}
    >
      {children}
    </div>
  )
}
