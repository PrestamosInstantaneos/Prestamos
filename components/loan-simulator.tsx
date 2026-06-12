"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button" // Importar Button
import { format, addDays, differenceInDays, isValid, parse } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle2, X, MessageSquare } from "lucide-react"


type BcvRate = {
  usd: number
  fetchedAt: string
  source: "bcv" | "fallback"
}

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const error = new Error(`An error occurred while fetching the data: ${res.status} ${res.statusText}`)
      // @ts-ignore
      error.info = await res.json()
      // @ts-ignore
      error.status = res.status
      throw error
    }
    return res.json()
  } catch (error) {
    console.error("Fetcher error:", error)
    throw error
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatBs(value: number) {
  return new Intl.NumberFormat("es-VE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Calcula el préstamo con un interés fijo de 0.8 USD por cada 1000 Bs.
 * Retorna el monto del préstamo en USD, el interés en USD, el total a pagar en USD y Bs, y los días.
 */
function calculateLoan(
  amount: number,
  paymentType: 'total' | 'installments' | 'others',
  firstPaymentDate: Date | null,
  lastPaymentDate: Date | null, // Usado para cuotas, para total es el mismo que firstPaymentDate
  bcvUsd: number,
  today: Date // Recibir 'today' como argumento
) {
  const defaultReturn = {
    loanAmountUsd: 0,
    interestUsd: 0,
    totalPaymentUsd: 0,
    totalPaymentBs: 0,
    firstInstallmentAmountUsd: 0,
    firstInstallmentAmountBs: 0,
    lastInstallmentAmountUsd: 0,
    lastInstallmentAmountBs: 0,
    firstPaymentDays: 0,
    lastPaymentDays: 0,
    totalDaysBetweenInstallments: 0,
  };

  if (paymentType === 'others') {
    return defaultReturn;
  }

  if (amount <= 0 || bcvUsd <= 0) {
    console.log("calculateLoan: Invalid amount or bcvUsd, returning zeros.")
    return defaultReturn;
  }

  const totalInterestUsd = (amount / 1000) * 0.8;
  const loanAmountUsd = amount / bcvUsd;
  const totalAmountToPayUsd = loanAmountUsd + totalInterestUsd;
  const totalAmountToPayBs = totalAmountToPayUsd * bcvUsd;

  if (paymentType === 'total') {
    if (!firstPaymentDate || !isValid(firstPaymentDate)) {
      console.log("calculateLoan (total): Invalid firstPaymentDate, returning zeros.");
      return defaultReturn;
    }
    const days = differenceInDays(firstPaymentDate, today);
    if (days < 0 || days > 31) {
      console.log("calculateLoan (total): Payment date out of range (days:", days, "), returning zeros.");
      return defaultReturn;
    }

    return {
      loanAmountUsd,
      interestUsd: totalInterestUsd,
      totalPaymentUsd: totalAmountToPayUsd,
      totalPaymentBs: totalAmountToPayBs,
      firstPaymentDays: days,
      lastPaymentDays: days, // Same for total payment
      totalDaysBetweenInstallments: 0,
      firstInstallmentAmountUsd: totalAmountToPayUsd,
      firstInstallmentAmountBs: totalAmountToPayBs,
      lastInstallmentAmountUsd: 0, // Not applicable for total payment
      lastInstallmentAmountBs: 0, // Not applicable for total payment
    };
  } else { // paymentType === 'installments'
    if (!firstPaymentDate || !isValid(firstPaymentDate) || !lastPaymentDate || !isValid(lastPaymentDate)) {
      console.log("calculateLoan (installments): Invalid installment dates, returning zeros.");
      return defaultReturn;
    }

    const firstDays = differenceInDays(firstPaymentDate, today);
    const lastDays = differenceInDays(lastPaymentDate, today);
    const daysBetweenInstallments = differenceInDays(lastPaymentDate, firstPaymentDate);

    // Validation for installment dates
    if (firstDays < 0 || firstDays > 31 || lastDays < 0 || lastDays > 31 || daysBetweenInstallments < 0 || daysBetweenInstallments > 31) {
      console.log("calculateLoan (installments): Payment dates out of range or invalid order, returning zeros.");
      console.log({ firstDays, lastDays, daysBetweenInstallments });
      return defaultReturn;
    }

    const installmentAmountUsd = totalAmountToPayUsd / 2;
    const installmentAmountBs = totalAmountToPayBs / 2;

    return {
      loanAmountUsd,
      interestUsd: totalInterestUsd,
      totalPaymentUsd: totalAmountToPayUsd,
      totalPaymentBs: totalAmountToPayBs,
      firstPaymentDays: firstDays,
      lastPaymentDays: lastDays,
      totalDaysBetweenInstallments: daysBetweenInstallments,
      firstInstallmentAmountUsd: installmentAmountUsd,
      firstInstallmentAmountBs: installmentAmountBs,
      lastInstallmentAmountUsd: installmentAmountUsd,
      lastInstallmentAmountBs: installmentAmountBs,
    };
  }
}

export function LoanSimulator() {
  const [amount, setAmount] = useState(1000) // Monto inicial en Bs
  const [paymentType, setPaymentType] = useState<'total' | 'installments' | 'others'>('total'); // Nuevo estado para el tipo de pago
  const [user, setUser] = useState<any | null>(null)

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<'confirm' | 'loading' | 'success' | 'error'>('confirm')
  const [modalErrorMessage, setModalErrorMessage] = useState('')

  const handleRequestLoanClick = () => {
    if (!user) return
    setModalStep('confirm')
    setModalErrorMessage('')
    setIsConfirmModalOpen(true)
  }

  const handleConfirmLoan = async () => {
    if (!user) return
    setModalStep('loading')
    try {
      const datesText = paymentType === 'total'
        ? (singlePaymentDate && isValid(singlePaymentDate) ? format(singlePaymentDate, "dd/MM/yyyy") : "")
        : paymentType === 'installments'
        ? `1ª Cuota: ${firstInstallmentDate && isValid(firstInstallmentDate) ? format(firstInstallmentDate, "dd/MM/yyyy") : ""}, 2ª Cuota: ${lastInstallmentDate && isValid(lastInstallmentDate) ? format(lastInstallmentDate, "dd/MM/yyyy") : ""}`
        : "A acordar con operador"

      const response = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombres: user.nombres,
          apellidos: user.apellidos,
          cedula: user.cedula,
          telefono: user.telefono,
          monto: paymentType === 'others' ? "Otros Montos (Monto a convenir)" : amount,
          modalidad: paymentType === 'total' ? "Pago Total" : paymentType === 'installments' ? "Cuotas" : "Otros Montos",
          fechas: datesText,
          bcvRate: bcvUsd,
          totalPagar: paymentType === 'others' ? "A convenir" : totalPaymentBs,
          montoCuota: paymentType === 'installments' ? totalPaymentBs / 2 : null,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || "Error al enviar la solicitud.")
      }

      setModalStep('success')
    } catch (err: any) {
      console.error("Error al solicitar préstamo:", err)
      setModalErrorMessage(err.message || "Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo.")
      setModalStep('error')
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

  // Estado para pago total
  const [singlePaymentDate, setSinglePaymentDate] = useState<Date | null>(null)
  const [singleDateInputValue, setSingleDateInputValue] = useState<string>("")
  const [singleDateInputError, setSingleDateInputError] = useState<string | null>(null);

  // Estado para pago en cuotas
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<Date | null>(null);
  const [firstInstallmentInputValue, setFirstInstallmentInputValue] = useState<string>("");
  const [firstInstallmentInputError, setFirstInstallmentInputError] = useState<string | null>(null);

  const [lastInstallmentDate, setLastInstallmentDate] = useState<Date | null>(null);
  const [lastInstallmentInputValue, setLastInstallmentInputValue] = useState<string>("");
  const [lastInstallmentInputError, setLastInstallmentInputError] = useState<string | null>(null);


  // Usar useEffect para inicializar la fecha solo en el cliente
  useEffect(() => {
    const initialToday = new Date();
    initialToday.setHours(0, 0, 0, 0);

    const initialSingleDate = initialToday;
    setSinglePaymentDate(initialSingleDate);
    setSingleDateInputValue(format(initialSingleDate, "dd/MM/yyyy"));

    const initialFirstInstallmentDate = initialToday;
    setFirstInstallmentDate(initialFirstInstallmentDate);
    setFirstInstallmentInputValue(format(initialFirstInstallmentDate, "dd/MM")); // Formato DD/MM
    // NO inicializar lastInstallmentDate aquí para evitar el conflicto de validación
    setLastInstallmentDate(null);
    setLastInstallmentInputValue("");
  }, []);

  // Asegurar que 'today' sea consistente para cálculos en el cliente (normalizado al inicio del día)
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, []);
  const currentYear = useMemo(() => format(today, "yyyy"), [today]); // Obtener el año actual

  const { data: rate, error } = useSWR<BcvRate>("/api/bcv-rate", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 1000 * 60 * 60, // reintenta cada hora en el cliente
  })

  // --- Logs para depuración en el navegador ---
  console.log("SWR Data (rate):", rate)
  console.log("SWR Error:", error)
  console.log("Current amount state:", amount)
  console.log("Payment Type:", paymentType);
  console.log("Single Payment Date:", singlePaymentDate, "Valid:", isValid(singlePaymentDate || new Date('invalid')));
  console.log("First Installment Date:", firstInstallmentDate, "Valid:", isValid(firstInstallmentDate || new Date('invalid')));
  console.log("Last Installment Date:", lastInstallmentDate, "Valid:", isValid(lastInstallmentDate || new Date('invalid')));
  // --- Fin de logs ---

  // Usar un valor de respaldo si la tasa del BCV no está disponible o es 0
  const bcvUsd = rate?.usd && rate.usd > 0 ? rate.usd : 1 // Fallback a 1 para que los cálculos no sean 0

  const {
    loanAmountUsd,
    interestUsd,
    totalPaymentUsd,
    totalPaymentBs,
    firstPaymentDays,
    lastPaymentDays,
    totalDaysBetweenInstallments,
    firstInstallmentAmountUsd,
    firstInstallmentAmountBs,
    lastInstallmentAmountUsd,
    lastInstallmentAmountBs,
  } = useMemo(
    () => calculateLoan(
      amount,
      paymentType,
      paymentType === 'total' ? singlePaymentDate : firstInstallmentDate,
      paymentType === 'total' ? null : lastInstallmentDate, // Pass last date for installments, null for total
      bcvUsd,
      today // Pasar 'today' a calculateLoan
    ),
    [amount, paymentType, singlePaymentDate, firstInstallmentDate, lastInstallmentDate, bcvUsd, today],
  );

  // Helper function for formatting DD/MM input
  const formatInstallmentDateInput = (value: string): string => {
    let cleaned = value.replace(/\D/g, ''); // Remove non-digits
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    // Limit to DD/MM (5 chars)
    return formatted.substring(0, 5);
  };

  // Helper function for parsing DD/MM input with current year
  const parseInstallmentInputToDate = (value: string, year: string): Date => {
    const fullDateString = `${value}/${year}`;
    return parse(fullDateString, "dd/MM/yyyy", new Date());
  };


  // Handlers para los inputs de fecha
  const handleSingleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setSingleDateInputValue(rawInput);

    if (!rawInput) {
      setSinglePaymentDate(null);
      setSingleDateInputError(null);
      return;
    }

    const parsedDate = parse(rawInput, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate)) {
      setSingleDateInputError("Formato de fecha inválido (DD/MM/YYYY).");
      setSinglePaymentDate(null);
      return;
    }

    const daysDiff = differenceInDays(parsedDate, today); // Usar 'today' consistente
    if (daysDiff < 0 || daysDiff > 31) {
      setSingleDateInputError("La fecha debe ser a partir de hoy (máximo 31 días).");
      setSinglePaymentDate(null);
      return;
    }

    setSinglePaymentDate(parsedDate);
    setSingleDateInputError(null);
  };

  const handleFirstInstallmentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const formattedInput = formatInstallmentDateInput(rawInput);
    setFirstInstallmentInputValue(formattedInput);

    if (!formattedInput) {
      setFirstInstallmentDate(null);
      setFirstInstallmentInputError(null);
      return;
    }

    const parsedDate = parseInstallmentInputToDate(formattedInput, currentYear);
    if (!isValid(parsedDate)) {
      setFirstInstallmentInputError("Formato de fecha inválido (DD/MM).");
      setFirstInstallmentDate(null);
      return;
    }

    const daysDiff = differenceInDays(parsedDate, today); // Usar 'today' consistente
    if (daysDiff < 0 || daysDiff > 31) {
      setFirstInstallmentInputError("La fecha debe ser a partir de hoy (máximo 31 días).");
      setFirstInstallmentDate(null);
      return;
    }

    // Validaciones adicionales para cuotas
    if (lastInstallmentDate && isValid(lastInstallmentDate)) { // Solo validar si lastInstallmentDate ya está establecida
      console.log("--- Debugging handleFirstInstallmentDateChange ---");
      console.log("New first installment date (parsedDate):", parsedDate.toISOString());
      console.log("Existing last installment date (lastInstallmentDate):", lastInstallmentDate.toISOString());

      const diffBetweenInstallments = differenceInDays(lastInstallmentDate, parsedDate);
      console.log("Difference in days (last - new_first):", diffBetweenInstallments);

      if (diffBetweenInstallments < 0) { // This means parsedDate (new first) is AFTER lastInstallmentDate
        setFirstInstallmentInputError("La primera cuota no puede ser posterior a la última cuota.");
        setFirstInstallmentDate(null);
        return;
      }
      if (diffBetweenInstallments > 31) { // This means the range is too wide
        setFirstInstallmentInputError("El rango entre cuotas no puede exceder los 31 días.");
        setFirstInstallmentDate(null);
        return;
      }
    }

    setFirstInstallmentDate(parsedDate);
    setFirstInstallmentInputError(null);
  };

  const handleLastInstallmentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const formattedInput = formatInstallmentDateInput(rawInput);
    setLastInstallmentInputValue(formattedInput);

    if (!formattedInput) {
      setLastInstallmentDate(null);
      setLastInstallmentInputError(null);
      return;
    }

    const parsedDate = parseInstallmentInputToDate(formattedInput, currentYear);
    if (!isValid(parsedDate)) {
      setLastInstallmentInputError("Formato de fecha inválido (DD/MM).");
      setLastInstallmentDate(null);
      return;
    }

    const daysDiff = differenceInDays(parsedDate, today); // Usar 'today' consistente
    if (daysDiff < 0 || daysDiff > 31) {
      setLastInstallmentInputError("La fecha debe ser a partir de hoy (máximo 31 días).");
      setLastInstallmentDate(null);
      return;
    }

    // Validaciones adicionales para cuotas
    if (firstInstallmentDate && isValid(firstInstallmentDate)) { // Solo validar si firstInstallmentDate ya está establecida
      const diffBetweenInstallments = differenceInDays(parsedDate, firstInstallmentDate);
      console.log("handleLastInstallmentDateChange - parsedDate:", parsedDate);
      console.log("handleLastInstallmentDateChange - firstInstallmentDate:", firstInstallmentDate);
      console.log("handleLastInstallmentDateChange - diffBetweenInstallments (last - first):", diffBetweenInstallments);

      if (diffBetweenInstallments < 0) { // This means parsedDate (new last) is BEFORE firstInstallmentDate
        setLastInstallmentInputError("La última cuota no puede ser anterior a la primera cuota.");
        setLastInstallmentDate(null);
        return;
      }
      if (diffBetweenInstallments > 31) { // This means the range is too wide
        setLastInstallmentInputError("El rango entre cuotas no puede exceder los 31 días.");
        setLastInstallmentDate(null);
        return;
      }
    }

    setLastInstallmentDate(parsedDate);
    setLastInstallmentInputError(null);
  };


  return (
    <section id="simulador" className="border-t border-border py-12 md:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        
        {/* Encabezado de Sección Centrado */}
        <div className="mx-auto max-w-2xl text-center mb-10 md:mb-14">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-primary">
            SIMULADOR
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl md:text-4xl">
            Calcula tu cuota mensual
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
            Ajusta el monto y la fecha de cancelación para ver tu cuota estimada. Sin
            compromiso y totalmente transparente.
          </p>
          
          {/* Tasa del dólar oficial (BCV) flotante */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-card/30 backdrop-blur-sm px-4 py-2.5 shadow-md">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs sm:text-sm text-left">
              <span className="text-muted-foreground">Dólar oficial BCV: </span>
              <span className="font-semibold text-foreground">
                {rate ? `Bs. ${formatBs(rate.usd)}` : "Cargando..."}
              </span>
              {rate && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  · Actualizado {new Date(rate.fetchedAt).toLocaleDateString("es-VE")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grilla de dos tarjetas alineadas */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-start max-w-5xl mx-auto">
          
          {/* Tarjeta 1: Configurador / Inputs */}
          <div className="rounded-2xl border border-border/60 bg-card/55 backdrop-blur-xl p-5 sm:p-8 lg:p-10 space-y-6 flex flex-col justify-between lg:min-h-[460px] shadow-xl">
            <div>
              {/* Selector de tipo de pago */}
              <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Modalidad:
                </span>
                <div className="flex bg-background/55 border border-border/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPaymentType('total')}
                    className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
                      paymentType === 'total'
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pago Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('installments')}
                    className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
                      paymentType === 'installments'
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Cuotas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('others')}
                    className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
                      paymentType === 'others'
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Otros Montos
                  </button>
                </div>
              </div>

              {paymentType === 'others' ? (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-5 bg-black/20 rounded-2xl border border-white/5 my-4">
                  <div className="rounded-full bg-primary/15 p-4 animate-bounce">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                    Presione en solicitar monto para que se contacten y acordar el monto a necesitar con un operador al instante.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Monto del préstamo */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Monto a solicitar
                      </span>
                      <span className="font-heading text-lg font-extrabold text-primary">
                        Bs. {formatBs(amount)}
                      </span>
                    </div>
                    <Slider
                      value={[amount]}
                      onValueChange={(v) =>
                        setAmount(Array.isArray(v) ? v[0] : v)
                      }
                      min={1000}
                      max={6000} // Límite a 6000 Bs
                      step={100}
                    />
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Bs. 1.000</span>
                      <span>Bs. 6.000</span>
                    </div>
                  </div>

                  {/* Sección de Fechas Condicional */}
                  {paymentType === 'total' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Fecha de pago total
                        </span>
                      </div>
                      <Input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={singleDateInputValue}
                        onChange={handleSingleDateChange}
                        className="bg-black/45 border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20 text-center font-mono py-5 text-sm shadow-inner rounded-xl"
                      />
                      {singleDateInputError && (
                        <p className="text-[11px] text-red-400 font-medium">{singleDateInputError}</p>
                      )}
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono pt-1">
                        <span>Plazo máximo: 31 días</span>
                        <span>Días hábiles: <strong className="text-foreground">{firstPaymentDays}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Fechas de cuotas (DD/MM)
                      </span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">1ª Cuota</label>
                          <Input
                            type="text"
                            placeholder="DD/MM"
                            value={firstInstallmentInputValue}
                            onChange={handleFirstInstallmentDateChange}
                            className="bg-black/45 border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20 text-center font-mono py-4 text-xs sm:text-sm shadow-inner rounded-xl"
                          />
                          {firstInstallmentInputError && (
                            <p className="text-[10px] text-red-400 leading-tight">{firstInstallmentInputError}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">2ª Cuota</label>
                          <Input
                            type="text"
                            placeholder="DD/MM"
                            value={lastInstallmentInputValue}
                            onChange={handleLastInstallmentDateChange}
                            className="bg-black/45 border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20 text-center font-mono py-4 text-xs sm:text-sm shadow-inner rounded-xl"
                          />
                          {lastInstallmentInputError && (
                            <p className="text-[10px] text-red-400 leading-tight">{lastInstallmentInputError}</p>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[10px] leading-normal text-muted-foreground">
                        * El año se auto-completa. Ambas deben estar entre 1 y 31 días a partir de hoy, y el rango entre ellas no puede exceder los 31 días.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Resumen / Resultados */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-xl p-5 sm:p-8 lg:p-10 flex flex-col justify-between lg:min-h-[460px] shadow-xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resumen del préstamo
              </p>
              <p className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary break-words">
                {paymentType === 'others' ? "Monto a convenir" : `${formatCurrency(loanAmountUsd)} - USD BCV`}
              </p>
              {paymentType !== 'others' && amount > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  ≈ Bs. {formatBs(amount)} al cambio oficial
                </p>
              )}

              <div className="mt-8 space-y-4 border-t border-border pt-6">
                {paymentType === 'others' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto solicitado</span>
                      <span className="font-semibold text-foreground">A convenir</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Modalidad</span>
                      <span className="font-semibold text-foreground">Otros Montos</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plazo</span>
                      <span className="font-semibold text-foreground">A acordar con operador</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto solicitado</span>
                      <span className="font-semibold text-foreground">
                        Bs. {formatBs(amount)}
                      </span>
                    </div>

                    {paymentType === 'total' ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fecha a Cancelar</span>
                        <span className="font-semibold text-foreground">
                          {singlePaymentDate && isValid(singlePaymentDate) ? format(singlePaymentDate, "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Primera Cuota</span>
                          <span className="font-semibold text-foreground">
                            {firstInstallmentDate && isValid(firstInstallmentDate) ? format(firstInstallmentDate, "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Última Cuota</span>
                          <span className="font-semibold text-foreground">
                            {lastInstallmentDate && isValid(lastInstallmentDate) ? format(lastInstallmentDate, "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-baseline mt-2 pt-2 border-t border-dashed border-border/40">
                          <span className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Por cuota (2 cuotas)</span>
                          <span className="font-heading text-lg sm:text-xl font-extrabold text-primary">
                            Bs. {formatBs(totalPaymentBs / 2)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex justify-between border-t border-border pt-4 text-base">
                  <span className="font-bold text-foreground">Total a pagar</span>
                  <span className="font-heading font-extrabold text-foreground">
                    {paymentType === 'others' ? "A convenir" : `Bs. ${formatBs(totalPaymentBs)}`}
                  </span>
                </div>
              </div>
            </div>

            {user && user.verificado !== "VERIFICADA" ? (
              <div className="mt-8 space-y-2">
                <button
                  disabled
                  className="w-full rounded-md bg-muted py-4 text-center text-xs font-bold tracking-widest text-muted-foreground cursor-not-allowed opacity-60 uppercase"
                >
                  {paymentType === 'others' ? "SOLICITAR MONTO" : "SOLICITAR ESTE PRÉSTAMO"}
                </button>
                <p className="text-center text-[10px] font-semibold text-destructive/80">
                  Debes verificar tu cuenta para solicitar préstamos.
                </p>
              </div>
            ) : user ? (
              <button
                type="button"
                onClick={handleRequestLoanClick}
                className="mt-8 block w-full rounded bg-primary py-4 text-center text-xs font-bold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 uppercase"
              >
                {paymentType === 'others' ? "SOLICITAR MONTO" : "SOLICITAR ESTE PRÉSTAMO"}
              </button>
            ) : (
              <a
                href="#solicitar"
                className="mt-8 block w-full rounded bg-primary py-4 text-center text-xs font-bold tracking-widest text-primary-foreground transition-opacity hover:opacity-90 uppercase"
              >
                {paymentType === 'others' ? "SOLICITAR MONTO" : "SOLICITAR ESTE PRÉSTAMO"}
              </a>
            )}
          </div>
          
        </div>
      </div>

      {/* Modal de Confirmación */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-foreground">
            
            {modalStep === 'confirm' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-primary font-heading uppercase tracking-wide">
                    Confirmar Solicitud
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Por favor, verifica los detalles antes de enviar tu solicitud.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modalidad:</span>
                    <span className="font-semibold text-foreground">
                      {paymentType === 'total' ? 'Pago Total' : paymentType === 'installments' ? 'Cuotas' : 'Otros Montos'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto:</span>
                    <span className="font-semibold text-foreground">
                      {paymentType === 'others' ? 'Monto a convenir' : `Bs. ${formatBs(amount)}`}
                    </span>
                  </div>
                  {paymentType !== 'others' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total a pagar:</span>
                      <span className="font-semibold text-foreground text-primary font-heading">
                        Bs. {formatBs(totalPaymentBs)}
                      </span>
                    </div>
                  )}
                  {paymentType === 'installments' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto por cuota:</span>
                      <span className="font-semibold text-foreground text-primary font-heading">
                        Bs. {formatBs(totalPaymentBs / 2)} (2 cuotas)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fechas de Pago:</span>
                    <span className="font-semibold text-foreground text-right">
                      {paymentType === 'total' 
                        ? (singlePaymentDate && isValid(singlePaymentDate) ? format(singlePaymentDate, "dd/MM/yyyy") : "N/A") 
                        : paymentType === 'installments' 
                        ? `1ª: ${firstInstallmentDate && isValid(firstInstallmentDate) ? format(firstInstallmentDate, "dd/MM") : "N/A"}, 2ª: ${lastInstallmentDate && isValid(lastInstallmentDate) ? format(lastInstallmentDate, "dd/MM") : "N/A"}`
                        : 'A convenir con operador'}
                    </span>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg p-3">
                  💡 <strong>Nota de confirmación:</strong> Al presionar <strong>Confirmar</strong>, su solicitud será enviada y un operador se pondrá en contacto con usted en breve a su teléfono para confirmar la transacción y pasarle el bauche (comprobante) de la operación.
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="w-1/2 rounded-xl border-white/10 bg-white/5 text-foreground hover:bg-white/10 py-5 text-xs font-bold uppercase"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmLoan}
                    className="w-1/2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 py-5 text-xs font-bold uppercase"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            {modalStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-foreground">Procesando solicitud...</p>
              </div>
            )}

            {modalStep === 'success' && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-emerald-400 font-heading uppercase">
                    ¡Solicitud Registrada!
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    Su solicitud ha sido enviada con éxito. Un operador le escribirá a su teléfono en breve para confirmar la transacción y pasarle el bauche de la operación.
                  </p>
                </div>
                <Button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 py-5 text-xs font-bold uppercase"
                >
                  Entendido
                </Button>
              </div>
            )}

            {modalStep === 'error' && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <X className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-red-400 font-heading uppercase">
                    Error al enviar
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {modalErrorMessage || "Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo."}
                  </p>
                </div>
                <Button
                  onClick={() => setModalStep('confirm')}
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90 py-5 text-xs font-bold uppercase"
                >
                  Reintentar
                </Button>
              </div>
            )}

          </div>
        </div>
      )}
    </section>

  )
}