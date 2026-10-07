import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Verónica Correa Makeup",
    template: "%s · Verónica Correa Makeup",
  },
  description:
    "Cursos y formaciones de maquillaje profesional con Verónica Correa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-VE" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
