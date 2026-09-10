-- CreateTable
CREATE TABLE "alertas_resueltas" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "referenciaTipo" TEXT NOT NULL,
    "referenciaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "urgencia" TEXT NOT NULL,
    "propietario" TEXT NOT NULL,
    "resueltaPorId" INTEGER NOT NULL,
    "resueltaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_resueltas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alertas_resueltas_tipo_referenciaTipo_referenciaId_key" ON "alertas_resueltas"("tipo", "referenciaTipo", "referenciaId");

-- AddForeignKey
ALTER TABLE "alertas_resueltas" ADD CONSTRAINT "alertas_resueltas_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
