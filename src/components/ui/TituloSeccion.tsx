import Link from "next/link";
import Etiqueta from "./Etiqueta";

type Props = {
  etiqueta?: string;
  titulo: string;
  enlace?: { texto: string; href: string };
  /** Nivel semántico del título (2 por defecto). */
  nivel?: 1 | 2 | 3;
  className?: string;
};

export default function TituloSeccion({
  etiqueta,
  titulo,
  enlace,
  nivel = 2,
  className = "",
}: Props) {
  const Titulo = `h${nivel}` as "h1" | "h2" | "h3";
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div>
        {etiqueta && <Etiqueta className="mb-2">{etiqueta}</Etiqueta>}
        <Titulo className="text-3xl font-light leading-tight md:text-4xl">
          {titulo}
        </Titulo>
        <span aria-hidden="true" className="mt-4 block h-px w-12 bg-dorado" />
      </div>
      {enlace && (
        <Link
          href={enlace.href}
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-dorado-profundo underline-offset-4 transition-colors duration-200 hover:underline"
        >
          {enlace.texto}
        </Link>
      )}
    </div>
  );
}
