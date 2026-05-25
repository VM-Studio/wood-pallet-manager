-- CreateTable
CREATE TABLE "plantillas_email" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "bloques" JSONB NOT NULL,
    "creadaPorId" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plantillas_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanas_seguimiento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "diasCondicion" INTEGER,
    "bloques" JSONB NOT NULL,
    "plantillaId" INTEGER,
    "enviadaPorId" INTEGER NOT NULL,
    "enviadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDestinatarios" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'enviado',

    CONSTRAINT "campanas_seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinatarios_campana" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "enviadoEn" TIMESTAMP(3),

    CONSTRAINT "destinatarios_campana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_automatizacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "evento" TEXT NOT NULL,
    "diasCondicion" INTEGER NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "asunto" TEXT NOT NULL,
    "creadaPorId" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reglas_automatizacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plantillas_email" ADD CONSTRAINT "plantillas_email_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanas_seguimiento" ADD CONSTRAINT "campanas_seguimiento_enviadaPorId_fkey" FOREIGN KEY ("enviadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanas_seguimiento" ADD CONSTRAINT "campanas_seguimiento_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinatarios_campana" ADD CONSTRAINT "destinatarios_campana_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas_seguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinatarios_campana" ADD CONSTRAINT "destinatarios_campana_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_automatizacion" ADD CONSTRAINT "reglas_automatizacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_automatizacion" ADD CONSTRAINT "reglas_automatizacion_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
