import type { Metadata } from "next";
import Boton from "@/components/ui/Boton";
import Contenedor from "@/components/ui/Contenedor";
import Etiqueta from "@/components/ui/Etiqueta";
import ImagenPlaceholder from "@/components/ui/ImagenPlaceholder";
import Insignia from "@/components/ui/Insignia";
import BarraProgreso from "@/components/ui/BarraProgreso";
import TituloSeccion from "@/components/ui/TituloSeccion";
import Logo from "@/components/marca/Logo";

export const metadata: Metadata = {
  title: "Guía de estilo",
  robots: { index: false, follow: false },
};

const colores = [
  { nombre: "blanco", hex: "#FFFFFF", uso: "Fondo principal", clase: "bg-blanco" },
  { nombre: "crema", hex: "#F5EFE6", uso: "Secciones alternas y tarjetas", clase: "bg-crema" },
  { nombre: "beige", hex: "#E8DCC8", uso: "Bordes finos y fondo de barras", clase: "bg-beige" },
  { nombre: "dorado", hex: "#B8975A", uso: "Líneas y barras. Nunca texto pequeño", clase: "bg-dorado" },
  { nombre: "dorado-profundo", hex: "#7A5C30", uso: "Botón principal, enlaces, destacados", clase: "bg-dorado-profundo" },
  { nombre: "tinta", hex: "#2B2622", uso: "Títulos y texto principal", clase: "bg-tinta" },
  { nombre: "gris-calido", hex: "#6B625A", uso: "Texto secundario", clase: "bg-gris-calido" },
];

const porcentajes = [0, 45, 85, 100];

function Bloque({
  etiqueta,
  titulo,
  children,
  fondo = "bg-blanco",
}: {
  etiqueta: string;
  titulo: string;
  children: React.ReactNode;
  fondo?: string;
}) {
  return (
    <section className={`${fondo} py-14 md:py-20`}>
      <Contenedor>
        <TituloSeccion etiqueta={etiqueta} titulo={titulo} className="mb-10" />
        {children}
      </Contenedor>
    </section>
  );
}

export default function GuiaDeEstilo() {
  return (
    <main>
      <section className="bg-crema py-14 md:py-20">
        <Contenedor>
          <Etiqueta className="mb-3">Página temporal</Etiqueta>
          <h1 className="text-4xl font-light md:text-6xl">Guía de estilo</h1>
          <p className="mt-4 max-w-xl text-gris-calido">
            Vista de referencia de la identidad visual y los componentes base
            de Vcorrea Makeup. Se elimina antes de publicar.
          </p>
        </Contenedor>
      </section>

      <Bloque etiqueta="Identidad" titulo="Paleta">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {colores.map((c) => (
            <li
              key={c.nombre}
              className="overflow-hidden rounded-tarjeta border border-beige bg-blanco"
            >
              <div className={`h-24 ${c.clase} border-b border-beige`} />
              <div className="p-4">
                <p className="font-medium">{c.nombre}</p>
                <p className="text-sm text-gris-calido">{c.hex}</p>
                <p className="mt-1 text-sm text-gris-calido">{c.uso}</p>
              </div>
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque etiqueta="Identidad" titulo="Tipografía" fondo="bg-crema">
        <div className="space-y-10">
          <div>
            <Etiqueta className="mb-4">Cormorant Garamond · 300 a 600</Etiqueta>
            <div className="space-y-3 font-display">
              <p className="text-6xl font-light">Título 60 · Light</p>
              <p className="text-5xl font-light">Título 48 · Light</p>
              <p className="text-4xl font-normal">Título 36 · Regular</p>
              <p className="text-3xl font-medium">Título 30 · Medium</p>
              <p className="text-2xl font-semibold">Título 24 · Semibold</p>
              <p className="text-xl font-normal">Subtítulo 20 · Regular</p>
            </div>
          </div>
          <div>
            <Etiqueta className="mb-4">Jost · 300 a 500</Etiqueta>
            <div className="space-y-3">
              <p className="text-lg font-light">Texto grande 18 · Light</p>
              <p className="text-base font-normal">
                Texto base 16 · Regular. Aprende maquillaje profesional paso a
                paso, con práctica real.
              </p>
              <p className="text-sm font-medium">Texto pequeño 14 · Medium</p>
              <p className="text-xs font-medium uppercase tracking-etiqueta text-dorado-profundo">
                Etiqueta 12 · Próximos cursos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-10">
            <Logo version="horizontal" />
            <Logo version="apilada" />
            <div className="rounded-tarjeta bg-tinta p-6">
              <Logo version="horizontal" color="blanco" />
            </div>
            <div className="rounded-tarjeta bg-tinta p-6">
              <Logo version="apilada" color="blanco" />
            </div>
          </div>
        </div>
      </Bloque>

      <Bloque etiqueta="Componentes" titulo="Botones">
        <div className="space-y-8">
          {(["normal", "grande"] as const).map((tamano) => (
            <div key={tamano}>
              <Etiqueta className="mb-3">Tamaño {tamano}</Etiqueta>
              <div className="flex flex-wrap items-center gap-3">
                <Boton tamano={tamano}>Inscribirme</Boton>
                <Boton tamano={tamano} variante="secundario">
                  Ver curso
                </Boton>
                <Boton tamano={tamano} variante="texto">
                  Ver detalles
                </Boton>
                <Boton tamano={tamano} disabled>
                  Cupos agotados
                </Boton>
                <Boton tamano={tamano} variante="secundario" disabled>
                  Desactivado
                </Boton>
              </div>
            </div>
          ))}
          <div>
            <Etiqueta className="mb-3">Variante clara (sobre foto)</Etiqueta>
            <div className="flex flex-wrap gap-3 rounded-tarjeta bg-tinta p-6">
              <Boton variante="claro">Ver cursos</Boton>
              <Boton variante="claro" tamano="grande">
                Ver cursos
              </Boton>
            </div>
          </div>
        </div>
      </Bloque>

      <Bloque etiqueta="Componentes" titulo="Insignias" fondo="bg-crema">
        <div className="flex flex-wrap gap-3">
          <Insignia tipo="ultimos-cupos" />
          <Insignia tipo="agotado" />
          <Insignia tipo="finalizado" />
          <Insignia tipo="pendiente" />
          <Insignia tipo="confirmada" />
        </div>
      </Bloque>

      <Bloque etiqueta="Componentes" titulo="Barras de inscripción">
        <div className="grid gap-4 md:grid-cols-2">
          {porcentajes.map((p) => (
            <div
              key={p}
              className="rounded-tarjeta border border-beige bg-crema p-5"
            >
              <p className="mb-3 text-sm text-gris-calido">
                Inscripciones · {p}%
              </p>
              <BarraProgreso porcentaje={p} />
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque etiqueta="Componentes" titulo="Imagen de relleno" fondo="bg-crema">
        <ImagenPlaceholder
          descripcion="retrato de Verónica"
          className="h-56 md:h-72"
        />
      </Bloque>
    </main>
  );
}
