"use client";
import { useState, useEffect } from "react";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  totalQuinielas: number;
  ganadoras: number;
  ultimaJornada: number | null;
};

export default function ParticipantesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modoBroadcast, setModoBroadcast] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [indiceActual, setIndiceActual] = useState(0);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/participantes")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setClientes(data);
        setCargando(false);
      });
  }, []);

  // Mensaje por defecto cuando abre el broadcast
  const abrirBroadcast = () => {
    setMensaje(
      `⚽ *TABLITAS QUINIELAS — Nueva Jornada disponible!*\n\n` +
      `¡Ya puedes registrar tus pronósticos para la siguiente jornada de Liga MX!\n\n` +
      `👉 Regístrate aquí: ${typeof window !== "undefined" ? window.location.origin : ""}/quiniela\n\n` +
      `💵 Solo $20 MXN por quiniela\n` +
      `🏆 Adivina todos los resultados y gana el premio\n\n` +
      `_Tablitas Quinielas_`
    );
    setIndiceActual(0);
    setEnviados(new Set());
    setModoBroadcast(true);
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda)
  );

  const clientesConTel = clientesFiltrados.filter((c) => c.telefono);

  const abrirWhatsApp = (telefono: string, msg: string) => {
    const numero = telefono.replace(/\D/g, "");
    const url = `https://wa.me/52${numero}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const siguiente = () => {
    const cliente = clientesConTel[indiceActual];
    if (!cliente) return;
    abrirWhatsApp(cliente.telefono, mensaje);
    setEnviados((prev) => new Set([...prev, cliente.id]));
    if (indiceActual < clientesConTel.length - 1) {
      setIndiceActual((i) => i + 1);
    }
  };

  // ── MODO BROADCAST ──────────────────────────────────────────────
  if (modoBroadcast) {
    const clienteActual = clientesConTel[indiceActual];
    const totalEnviados = enviados.size;
    const total = clientesConTel.length;
    const completado = totalEnviados === total;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white py-4 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <button onClick={() => setModoBroadcast(false)} className="text-amber-400 text-sm">
                ← Participantes
              </button>
              <h1 className="text-xl font-bold mt-0.5">Notificar por WhatsApp</h1>
            </div>
            <span className="text-amber-300/70 text-sm font-bold">
              {totalEnviados}/{total}
            </span>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
          {/* Barra de progreso */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progreso</span>
              <span className="font-bold text-amber-400">{totalEnviados} de {total} enviados</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (totalEnviados / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Editar mensaje */}
          <div className="bg-white rounded-xl p-4">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
              Mensaje (editable)
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          {!completado ? (
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700">
                  {indiceActual + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{clienteActual?.nombre}</p>
                  <p className="text-sm text-gray-500">+52 {clienteActual?.telefono}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">
                  {clienteActual?.totalQuinielas} quiniela{clienteActual?.totalQuinielas !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={siguiente}
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar a {clienteActual?.nombre} y siguiente →
              </button>

              {/* Lista de pendientes */}
              <div className="border-t pt-3 space-y-1 max-h-40 overflow-y-auto">
                {clientesConTel.map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-2 text-sm py-0.5 ${i === indiceActual ? "font-bold text-amber-700" : ""}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${enviados.has(c.id) ? "bg-green-500 text-white" : i === indiceActual ? "bg-yellow-400 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {enviados.has(c.id) ? "✓" : i + 1}
                    </span>
                    <span className={enviados.has(c.id) ? "line-through text-gray-400" : ""}>{c.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-amber-900 font-bold text-lg">¡Todos notificados!</h2>
              <p className="text-amber-700 text-sm">{total} mensajes enviados</p>
              <button
                onClick={() => setModoBroadcast(false)}
                className="mt-4 bg-amber-700 text-white font-bold px-6 py-2 rounded-xl"
              >
                Volver a participantes
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LISTA DE PARTICIPANTES ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-xl font-bold">Participantes</h1>
              <button
                onClick={abrirBroadcast}
                disabled={clientes.length === 0}
                className="bg-[#25D366] hover:bg-[#20b858] disabled:bg-gray-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Notificar
              </button>
            </div>
            <p className="text-amber-400 text-xs mt-0.5">{clientes.length} participantes</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        {cargando ? (
          <p className="text-center text-gray-400 py-8">Cargando...</p>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">👥</p>
            <p>No hay participantes aún</p>
            <p className="text-xs mt-1">Se registran automáticamente al ingresar su teléfono</p>
          </div>
        ) : (
          clientesFiltrados.map((c) => (
            <div key={c.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700 text-sm shrink-0">
                {c.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{c.nombre}</p>
                <p className="text-sm text-gray-500">+52 {c.telefono}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400">
                    🎯 {c.totalQuinielas} quiniela{c.totalQuinielas !== 1 ? "s" : ""}
                  </span>
                  {c.ganadoras > 0 && (
                    <span className="text-xs text-yellow-600 font-semibold">
                      🏆 {c.ganadoras} ganada{c.ganadoras !== 1 ? "s" : ""}
                    </span>
                  )}
                  {c.ultimaJornada && (
                    <span className="text-xs text-gray-400">J{c.ultimaJornada}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => abrirWhatsApp(c.telefono, mensaje || `Hola ${c.nombre}, hay nueva jornada en Tablitas Quinielas 🎯`)}
                className="shrink-0 bg-[#25D366] hover:bg-[#20b858] text-white p-2 rounded-lg transition-colors"
                title="Enviar WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
