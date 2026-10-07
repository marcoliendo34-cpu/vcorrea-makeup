import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  como?: ElementType;
  className?: string;
};

/** Eyebrow: texto pequeño en mayúsculas con espaciado amplio. */
export default function Etiqueta({
  children,
  como: Tag = "p",
  className = "",
}: Props) {
  return (
    <Tag
      className={`font-sans text-xs font-medium uppercase tracking-etiqueta text-dorado-profundo ${className}`}
    >
      {children}
    </Tag>
  );
}
