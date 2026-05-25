-- CreateEnum
CREATE TYPE "EstadoRetiro" AS ENUM ('pendiente', 'confirmado', 'completado', 'cancelado');

-- CreateTable
CREATE TABLE "retiros_galpon" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "codigoRetiro" TEXT NOT NULL,
    "estadoRetiro" "EstadoRetiro" NOT NULL DEFAULT 'pendiente',
    "galpon" TEXT,
    "horaEstimadaRetiro" TIMESTAMP(3),
    "confirmadoPorId" INTEGER,
    "fechaConfirmacion" TIMESTAMP(3),
    "observacionesConf" TEXT,
    "motivoCancelacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retiros_galpon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_reenvio_retiro" (
    "id" SERIAL NOT NULL,
    "retiroId" INTEGER NOT NULL,
    "emailEnviado" TEXT,
    "telefonoEnviado" TEXT,
    "enviadoPorId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_reenvio_retiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retiros_galpon_ventaId_key" ON "retiros_galpon"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "retiros_galpon_codigoRetiro_key" ON "retiros_galpon"("codigoRetiro");

-- AddForeignKey
ALTER TABLE "retiros_galpon" ADD CONSTRAINT "retiros_galpon_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_galpon" ADD CONSTRAINT "retiros_galpon_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_reenvio_retiro" ADD CONSTRAINT "historial_reenvio_retiro_retiroId_fkey" FOREIGN KEY ("retiroId") REFERENCES "retiros_galpon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_reenvio_retiro" ADD CONSTRAINT "historial_reenvio_retiro_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
