-- AlterTable
ALTER TABLE "devoluciones" ADD COLUMN     "fechaStockRestaurado" TIMESTAMP(3),
ADD COLUMN     "fechaTransferenciaDevuelta" TIMESTAMP(3),
ADD COLUMN     "transferenciaDevuelta" BOOLEAN NOT NULL DEFAULT false;
