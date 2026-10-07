import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBoton = "principal" | "secundario" | "claro" | "texto";
export type TamanoBoton = "normal" | "grande";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-medium rounded-boton " +
  "transition-colors duration-200 select-none cursor-pointer " +
  "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const variantes: Record<VarianteBoton, string> = {
  principal:
    "bg-dorado-profundo text-blanco border border-dorado-profundo hover:bg-tinta hover:border-tinta " +
    "disabled:bg-beige disabled:border-beige disabled:text-gris-calido disabled:hover:bg-beige " +
    "aria-disabled:bg-beige aria-disabled:border-beige aria-disabled:text-gris-calido",
  secundario:
    "bg-transparent text-tinta border border-tinta hover:bg-tinta hover:text-blanco " +
    "disabled:border-beige disabled:text-gris-calido disabled:hover:bg-transparent disabled:hover:text-gris-calido",
  claro:
    "bg-blanco text-tinta border border-blanco hover:bg-crema hover:border-crema " +
    "disabled:opacity-60 disabled:hover:bg-blanco",
  texto:
    "bg-transparent text-dorado-profundo border border-transparent underline-offset-4 hover:underline " +
    "disabled:text-gris-calido disabled:no-underline",
};

const tamanos: Record<TamanoBoton, string> = {
  normal: "min-h-11 px-5 text-sm",
  grande: "min-h-14 px-8 text-base",
};

type PropsComunes = {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  className?: string;
  children: ReactNode;
};

type PropsBoton = PropsComunes &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type PropsEnlace = PropsComunes & {
  href: string;
  desactivado?: boolean;
  target?: string;
  rel?: string;
};

function clases(
  variante: VarianteBoton,
  tamano: TamanoBoton,
  extra?: string,
) {
  const tam = variante === "texto" ? "min-h-11 px-1 text-sm" : tamanos[tamano];
  return [base, variantes[variante], tam, extra].filter(Boolean).join(" ");
}

export default function Boton(props: PropsBoton | PropsEnlace) {
  const { variante = "principal", tamano = "normal", className } = props;

  if (props.href !== undefined) {
    const { href, children, desactivado, target, rel } = props;
    if (desactivado) {
      return (
        <span
          role="link"
          aria-disabled="true"
          className={clases(variante, tamano, className)}
        >
          {children}
        </span>
      );
    }
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={clases(variante, tamano, className)}
      >
        {children}
      </Link>
    );
  }

  const { children, type = "button", ...resto } = props;
  const nativas = { ...resto } as Record<string, unknown>;
  delete nativas.variante;
  delete nativas.tamano;
  delete nativas.className;
  return (
    <button
      type={type}
      {...nativas}
      className={clases(variante, tamano, className)}
    >
      {children}
    </button>
  );
}
