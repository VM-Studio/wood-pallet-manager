-- Ventas que ya estaban canceladas (ej. desde Retiros): sus registros
-- relacionados quedan cancelados/anulados, igual que con la nueva cancelación
-- en cascada. No modifica stock ni cobros registrados.
UPDATE "facturas" SET "estadoCobro" = 'anulada'
WHERE "ventaId" IN (SELECT id FROM "ventas" WHERE "estadoPedido" = 'cancelado')
  AND "estadoCobro" <> 'anulada';

UPDATE "logistica" SET "estadoEntrega" = 'cancelado'
WHERE "ventaId" IN (SELECT id FROM "ventas" WHERE "estadoPedido" = 'cancelado')
  AND "estadoEntrega" <> 'entregado';

UPDATE "retiros_galpon" SET "estadoRetiro" = 'cancelado'
WHERE "ventaId" IN (SELECT id FROM "ventas" WHERE "estadoPedido" = 'cancelado')
  AND "estadoRetiro" <> 'completado';

UPDATE "remitos" SET "estado" = 'cancelado'
WHERE "ventaId" IN (SELECT id FROM "ventas" WHERE "estadoPedido" = 'cancelado');

UPDATE "solicitudes_logistica" SET "estado" = 'cancelada'
WHERE "ventaId" IN (SELECT id FROM "ventas" WHERE "estadoPedido" = 'cancelado')
  AND "estado" = 'pendiente';

UPDATE "ventas" v SET "motivoCancelacion" = r."motivoCancelacion"
FROM "retiros_galpon" r
WHERE r."ventaId" = v.id AND v."estadoPedido" = 'cancelado'
  AND v."motivoCancelacion" IS NULL AND r."motivoCancelacion" IS NOT NULL;
