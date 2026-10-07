type Props = {
  /** Descripción de la foto que falta, p. ej. "retrato de Verónica". */
  descripcion: string;
  className?: string;
};

export default function ImagenPlaceholder({
  descripcion,
  className = "",
}: Props) {
  return (
    <div
      role="img"
      aria-label={`Foto pendiente: ${descripcion}`}
      className={`flex items-center justify-center rounded-tarjeta border border-beige bg-crema p-6 text-center ${className}`}
    >
      <span className="font-display text-lg font-light italic text-gris-calido">
        Foto: [{descripcion}]
      </span>
    </div>
  );
}
