import type { ReactNode } from "react";

export type TipoInsignia =
  | "ultimos-cupos"
  | "agotado"
  | "finalizado"
  | "pendiente"
  | "confirmada";

const estilos: Record<TipoInsignia, { texto: string; clases: string }> = {
  "ultimos-cupos": {
    texto: "Últimos cupos",
    clases: "bg-tinta text-crema border-tinta",
  },
  agotado: {
    texto: "Agotado",
    clases: "bg-blanco text-gris-calido border-beige",
  },
  finalizado: {
    texto: "Finalizado",
    clases: "bg-crema text-gris-calido border-beige",
  },
  pendiente: {
    texto: "Pendiente de confirmación",
    clases: "bg-blanco text-dorado-profundo border-dorado-profundo",
  },
  confirmada: {
    texto: "Confirmada",
    clases: "bg-dorado-profundo text-blanco border-dorado-profundo",
  },
};

type Props = {
  tipo: TipoInsignia;
  /** Reemplaza el texto por defecto. */
  children?: ReactNode;
  className?: string;
};

export default function Insignia({ tipo, children, className = "" }: Props) {
  const { texto, clases } = estilos[tipo];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.12em] ${clases} ${className}`}
    >
      {children ?? texto}
    </span>
  );
}
