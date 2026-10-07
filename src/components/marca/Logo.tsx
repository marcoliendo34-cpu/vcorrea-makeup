type Props = {
  /** horizontal: header. apilada: footer. */
  version?: "horizontal" | "apilada";
  color?: "tinta" | "blanco";
  className?: string;
};

export default function Logo({
  version = "horizontal",
  color = "tinta",
  className = "",
}: Props) {
  const tono = color === "blanco" ? "text-blanco" : "text-tinta";

  if (version === "apilada") {
    return (
      <div
        className={`inline-flex flex-col items-center text-center leading-none ${tono} ${className}`}
      >
        <span className="font-display text-4xl font-light">Verónica</span>
        <span className="font-display text-4xl font-light">Correa</span>
        <span className="mt-3 font-sans text-[11px] font-light uppercase tracking-marca pl-[0.35em]">
          Makeup
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col leading-none ${tono} ${className}`}
    >
      <span className="font-display text-[28px] font-light">
        Verónica Correa
      </span>
      <span className="mt-1.5 font-sans text-[10px] font-light uppercase tracking-marca">
        Makeup
      </span>
    </div>
  );
}
