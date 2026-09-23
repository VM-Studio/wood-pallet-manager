-- AlterTable: un cliente puede ser local, exportador o ambos
ALTER TABLE "clientes" ADD COLUMN "esLocal" BOOLEAN NOT NULL DEFAULT true;

-- Los clientes que hoy son exportadores se mostraban solo como "Exportador"
UPDATE "clientes" SET "esLocal" = false WHERE "esExportador" = true;
