import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthGuard } from "@/components/AuthGuard";
import { SwRegistrar } from "@/components/SwRegistrar";
import { HamburgerMenu } from "@/components/HamburgerMenu";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tablitas Quinielas",
  description: "Registra tu quiniela de futbol — Tablitas Quinielas",
  icons: { icon: "/logo-tablitas.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${geist.className} min-h-full flex flex-col bg-gray-50`} suppressHydrationWarning>
        <Providers>
          <SwRegistrar />
          <AuthGuard />
          <HamburgerMenu />
          {children}
        </Providers>
      </body>
    </html>
  );
}
