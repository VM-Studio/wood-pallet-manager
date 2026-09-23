-- AlterTable
ALTER TABLE "historial_reenvio_retiro" ADD COLUMN     "proveedorId" INTEGER,
ADD COLUMN     "tipoMensaje" TEXT;

-- AlterTable
ALTER TABLE "retiros_galpon" ADD COLUMN     "proveedorId" INTEGER;

-- AddForeignKey
ALTER TABLE "retiros_galpon" ADD CONSTRAINT "retiros_galpon_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_reenvio_retiro" ADD CONSTRAINT "historial_reenvio_retiro_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Vincular los retiros existentes con su galpón (proveedor) cuando el nombre
-- guardado coincide con un único proveedor (ej. "Todo Pallets", "Galpón Familiar").
UPDATE "retiros_galpon" r
SET "proveedorId" = m.id
FROM (
  SELECT r2.id AS "retiroId", MIN(p.id) AS id
  FROM "retiros_galpon" r2
  JOIN "proveedores" p ON p."nombreEmpresa" ILIKE r2."galpon" || '%'
  WHERE r2."galpon" IS NOT NULL AND r2."galpon" <> '' AND p."activo" = true
  GROUP BY r2.id
  HAVING COUNT(*) = 1
) m
WHERE r.id = m."retiroId" AND r."proveedorId" IS NULL;
