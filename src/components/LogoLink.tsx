import Link from "next/link";
import React from "react";

export function LogoLink({ height = 44, className }: { height?: number; className?: string }) {
  return (
    <Link href="/" style={{ flexShrink: 0, display: "inline-block" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-tablitas.png"
        alt="Tablitas Quinielas"
        style={{ height: `${height}px`, objectFit: "contain" }}
        className={className}
      />
    </Link>
  );
}
