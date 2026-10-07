import { redirect } from "next/navigation";

// Temporal: el Inicio real se construye en un paso posterior.
export default function Home() {
  redirect("/guia-de-estilo");
}
