-- CreateEnum
CREATE TYPE "EstadoCotizacionWeb" AS ENUM ('pendiente', 'vista', 'convertida', 'descartada');

-- CreateTable
CREATE TABLE "cotizaciones_web" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "tipoPallet" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fechaNecesidad" TIMESTAMP(3),
    "tipoEntrega" TEXT NOT NULL,
    "localidadEntrega" TEXT,
    "requiereSenasa" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "estado" "EstadoCotizacionWeb" NOT NULL DEFAULT 'pendiente',
    "propietarioAsignadoId" INTEGER,
    "cotizacionId" INTEGER,
    "motivoDescarte" TEXT,
    "ipOrigen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_web_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_web_cotizacionId_key" ON "cotizaciones_web"("cotizacionId");

-- AddForeignKey
ALTER TABLE "cotizaciones_web" ADD CONSTRAINT "cotizaciones_web_propietarioAsignadoId_fkey" FOREIGN KEY ("propietarioAsignadoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_web" ADD CONSTRAINT "cotizaciones_web_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
