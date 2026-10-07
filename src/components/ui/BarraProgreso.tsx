"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Porcentaje entero de 0 a 100. */
  porcentaje: number;
  /** Texto accesible; por defecto "Inscripciones: N%". */
  etiqueta?: string;
  className?: string;
};

export default function BarraProgreso({
  porcentaje,
  etiqueta,
  className = "",
}: Props) {
  const valor = Math.min(100, Math.max(0, Math.round(porcentaje)));
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      aria-label={etiqueta ?? `Inscripciones: ${valor}%`}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-beige ${className}`}
    >
      <div
        className="h-full rounded-full bg-dorado transition-[width] duration-700 ease-out"
        style={{ width: visible ? `${valor}%` : "0%" }}
      />
    </div>
  );
}
