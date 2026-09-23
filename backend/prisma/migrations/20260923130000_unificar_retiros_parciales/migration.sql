-- Unifica los retiros parciales: el módulo Retiros guardaba solo un contador
-- total (retiros_galpon.cantidadRetiradaParcial) sin detalle por producto.
-- Para ventas de un solo producto se pasa esa diferencia al detalle de la venta
-- (retiros_parciales), que ahora es la fuente única. No toca el stock.
WITH pendientes AS (
  SELECT
    r."ventaId",
    d.id AS "detalleId",
    COALESCE(r."fechaUltimoRetiroParcial", CURRENT_TIMESTAMP) AS fecha,
    COALESCE(r."confirmadoPorId", v."usuarioId") AS usuario,
    LEAST(
      r."cantidadRetiradaParcial" - COALESCE((SELECT SUM(rp."cantidadRetirada") FROM "retiros_parciales" rp WHERE rp."detalleVentaId" = d.id), 0),
      d."cantidadPedida"        - COALESCE((SELECT SUM(rp."cantidadRetirada") FROM "retiros_parciales" rp WHERE rp."detalleVentaId" = d.id), 0)
    ) AS faltante
  FROM "retiros_galpon" r
  JOIN "ventas" v ON v.id = r."ventaId"
  JOIN "detalle_venta" d ON d."ventaId" = r."ventaId"
  WHERE r."cantidadRetiradaParcial" > 0
    AND (SELECT COUNT(*) FROM "detalle_venta" d2 WHERE d2."ventaId" = r."ventaId") = 1
)
INSERT INTO "retiros_parciales" ("detalleVentaId", "fechaRetiro", "cantidadRetirada", "registradoPorId")
SELECT "detalleId", fecha, faltante, usuario FROM pendientes WHERE faltante > 0;

UPDATE "detalle_venta" d
SET "cantidadEntregada" = s.total
FROM (
  SELECT "detalleVentaId", SUM("cantidadRetirada")::int AS total
  FROM "retiros_parciales" GROUP BY "detalleVentaId"
) s
WHERE s."detalleVentaId" = d.id AND d."cantidadEntregada" <> s.total;

-- El estado de la venta (que ven Ventas, Logística y Retiros) debe reflejar el retiro parcial
UPDATE "ventas" v
SET "estadoPedido" = 'entregado_parcial'
FROM "retiros_galpon" r
WHERE r."ventaId" = v.id
  AND r."estadoRetiro" = 'parcial'
  AND v."estadoPedido" NOT IN ('entregado_parcial', 'entregado', 'cancelado');
