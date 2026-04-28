-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jornada" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "temporada" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "equipoLocal" TEXT NOT NULL,
    "equipoVisita" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "golesLocal" INTEGER,
    "golesVisita" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiniela" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "usuarioId" TEXT,
    "jornadaId" TEXT NOT NULL,
    "nombreCliente" TEXT,
    "telefonoCliente" TEXT,
    "canal" TEXT NOT NULL DEFAULT 'online',
    "monto" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "puntos" INTEGER,
    "aciertos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiniela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL,
    "quinielaId" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "prediccion" TEXT NOT NULL,
    "acertado" BOOLEAN,

    CONSTRAINT "Pick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Quiniela_folio_key" ON "Quiniela"("folio");

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quiniela" ADD CONSTRAINT "Quiniela_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quiniela" ADD CONSTRAINT "Quiniela_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_quinielaId_fkey" FOREIGN KEY ("quinielaId") REFERENCES "Quiniela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
