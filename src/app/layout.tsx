import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quinielas MX - Liga MX",
  description: "Registra tu quiniela de la Liga MX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${geist.className} min-h-full flex flex-col bg-gray-50`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
