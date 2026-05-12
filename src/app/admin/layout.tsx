import NotificationBell from "@/components/NotificationBell";

// Este layout envuelve TODAS las páginas del admin
// Solo agrega el bell flotante — no toca el contenido de cada página
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Bell flotante — visible en todas las páginas del admin */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 200,
      }}>
        <NotificationBell float />
      </div>
    </>
  );
}
