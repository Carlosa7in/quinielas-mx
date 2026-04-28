"use client";
import { useRouter } from "next/navigation";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";

export default function FormaIndexPage() {
  const router = useRouter();

  const seleccionar = (j: JornadaResumen) => {
    router.push(`/admin/forma/${j.id}`);
  };

  return <JornadaSelector onSelect={seleccionar} titulo="Imprimir Formas" />;
}
