"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button" // Importar Button
import { format, addDays, differenceInDays, isValid, parse } from "date-fns"
import { es } from "date-fns/locale"

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
  paymentType: 'total' | 'installments',
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
    if (days <= 0 || days > 31) {
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
    if (firstDays <= 0 || firstDays > 31 || lastDays <= 0 || lastDays > 31 || daysBetweenInstallments < 0 || daysBetweenInstallments > 31) {
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
  const [paymentType, setPaymentType] = useState<'total' | 'installments'>('total'); // Nuevo estado para el tipo de pago
  const [user, setUser] = useState<{ verificado?: string } | null>(null)

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
    const initialToday = new Date(); // Asegurar que 'today' sea consistente para la inicialización
    const initialSingleDate = addDays(initialToday, 1);
    setSinglePaymentDate(initialSingleDate);
    setSingleDateInputValue(format(initialSingleDate, "dd/MM/yyyy"));

    const initialFirstInstallmentDate = addDays(initialToday, 1);
    setFirstInstallmentDate(initialFirstInstallmentDate);
    setFirstInstallmentInputValue(format(initialFirstInstallmentDate, "dd/MM")); // Formato DD/MM
    // NO inicializar lastInstallmentDate aquí para evitar el conflicto de validación
    setLastInstallmentDate(null);
    setLastInstallmentInputValue("");
  }, []);

  // Asegurar que 'today' sea consistente para cálculos en el cliente
  const today = useMemo(() => new Date(), []);
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
    if (daysDiff <= 0 || daysDiff > 31) {
      setSingleDateInputError("La fecha debe ser entre 1 y 31 días a partir de hoy.");
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
    if (daysDiff <= 0 || daysDiff > 31) {
      setFirstInstallmentInputError("La fecha debe ser entre 1 y 31 días a partir de hoy.");
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
    if (daysDiff <= 0 || daysDiff > 31) {
      setLastInstallmentInputError("La fecha debe ser entre 1 y 31 días a partir de hoy.");
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
    <section id="simulador" className="border-t border-border py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            {/* Botones de Tipo de Pago */}
            <div className="mb-4 flex space-x-2">
              <Button
                variant={paymentType === 'total' ? 'default' : 'outline'}
                onClick={() => setPaymentType('total')}
              >
                Pago Total
              </Button>
              <Button
                variant={paymentType === 'installments' ? 'default' : 'outline'}
                onClick={() => setPaymentType('installments')}
              >
                Cuotas
              </Button>
            </div>

            <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-primary">
              SIMULADOR
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              Calcula tu cuota mensual
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
              Ajusta el monto y la fecha de cancelación para ver tu cuota estimada. Sin
              compromiso y totalmente transparente.
            </p>

            {/* Tasa del dólar oficial (BCV) */}
            <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <div className="text-sm">
                <span className="text-muted-foreground">Dólar oficial BCV: </span>
                <span className="font-semibold text-foreground">
                  {rate ? `Bs. ${formatBs(rate.usd)}` : "Cargando..."}
                </span>
                {rate && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {rate.source === "bcv"
                      ? `· Actualizado ${new Date(rate.fetchedAt).toLocaleDateString("es-VE")}`
                      : "· Valor de referencia"}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-10 space-y-10">
              <div>
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Monto del préstamo (Bs)
                  </span>
                  <span className="font-heading text-2xl font-bold text-foreground">
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
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Bs. 1.000</span>
                  <span>Bs. 6.000</span>
                </div>
              </div>

              {/* Sección de Fechas Condicional */}
              {paymentType === 'total' ? (
                <div>
                  <div className="mb-4 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Fecha de cancelación
                    </span>
                    <span className="font-heading text-2xl font-bold text-foreground">
                      {singlePaymentDate && isValid(singlePaymentDate) ? format(singlePaymentDate, "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}
                    </span>
                  </div>
                  <Input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={singleDateInputValue}
                    onChange={handleSingleDateChange}
                  />
                  {singleDateInputError && (
                    <p className="mt-1 text-xs text-red-500">{singleDateInputError}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ingresa la fecha de cancelación (DD/MM/YYYY). Máximo 31 días a partir de hoy.
                  </p>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Días para cancelar: {firstPaymentDays}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4"> {/* Usamos space-y-4 para acercar los campos */}
                  <div>
                    <div className="mb-2"> {/* Reducido el margen */}
                      <span className="text-sm font-medium text-muted-foreground">
                        Primera Cuota
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="DD/MM" // Actualizado placeholder
                      value={firstInstallmentInputValue}
                      onChange={handleFirstInstallmentDateChange}
                    />
                    {firstInstallmentInputError && (
                      <p className="mt-1 text-xs text-red-500">{firstInstallmentInputError}</p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2"> {/* Reducido el margen */}
                      <span className="text-sm font-medium text-muted-foreground">
                        Última Cuota
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="DD/MM" // Actualizado placeholder
                      value={lastInstallmentInputValue}
                      onChange={handleLastInstallmentDateChange}
                    />
                    {lastInstallmentInputError && (
                      <p className="mt-1 text-xs text-red-500">{lastInstallmentInputError}</p>
                    )}
                  </div>
                  {/* Nota instructiva combinada */}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ingresa las fechas de las cuotas (DD/MM). Ambas deben estar entre 1 y 31 días a partir de hoy, y el rango entre ellas no puede exceder los 31 días. El año se auto-completa.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Result card */}
          <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
            <p className="text-sm font-medium text-muted-foreground">
              Resumen de prestamo
            </p>
            <p className="mt-2 font-heading text-5xl font-extrabold tracking-tight text-primary">
              {formatCurrency(loanAmountUsd)} - USD BCV
            </p>
            {amount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                ≈ Bs. {formatBs(amount)} al cambio oficial
              </p>
            )}

            <div className="mt-8 space-y-4 border-t border-border pt-6">
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
                  <div className="flex justify-between text-sm items-baseline mt-2">
                    <span className="text-muted-foreground text-lg font-medium">Cantidad por cuota</span>
                    <span className="font-heading text-2xl font-bold text-primary">
                      Bs. {formatBs(totalPaymentBs / 2)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between border-t border-border pt-4 text-base">
                <span className="font-medium text-foreground">Total a pagar</span>
                <span className="font-heading font-bold text-foreground">
                  Bs. {formatBs(totalPaymentBs)}
                </span>
              </div>
            </div>

            {user && user.verificado !== "VERIFICADA" ? (
              <div className="mt-8 space-y-2">
                <button
                  disabled
                  className="w-full rounded-md bg-muted py-4 text-center text-sm font-semibold tracking-widest text-muted-foreground cursor-not-allowed opacity-60"
                >
                  SOLICITAR ESTE PRÉSTAMO
                </button>
                <p className="text-center text-xs font-semibold text-destructive/80 mt-2">
                  Debes verificar tu cuenta para solicitar préstamos. Solo puedes usar el simulador por el momento.
                </p>
              </div>
            ) : (
              <a
                href="#solicitar"
                className="mt-8 block w-full rounded-md bg-primary py-4 text-center text-sm font-semibold tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
              >
                SOLICITAR ESTE PRÉSTAMO
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}