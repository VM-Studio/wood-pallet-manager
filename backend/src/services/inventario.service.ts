import prisma from '../utils/prisma';

// Stock consolidado: TODOS los productos activos, con o sin stock registrado.
// Un producto NUNCA aparece duplicado. Stock nunca puede ser negativo.
export const getStockConsolidadoService = async () => {
  // 1. Todos los productos activos del catálogo
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, tipo: true, condicion: true },
    orderBy: { nombre: 'asc' },
  });

  // 2. Todos los registros de stock (puede haber varios por producto si tiene múltiples proveedores)
  const stocks = await prisma.stock.findMany({
    where: { producto: { activo: true } },
    include: {
      producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } },
    },
  });

  // 3. Consolidar stock por productoId (1 entrada por producto, sin duplicados)
  const consolidado: Record<number, any> = {};

  for (const s of stocks) {
    const pid = s.productoId;
    if (!consolidado[pid]) {
      consolidado[pid] = {
        producto: s.producto,
        stockTotalPropio: 0,
        stockTotalDeudor: 0,
        porGalpon: [],
      };
    }
    // Nunca sumar valores negativos al total
    const disponibleSaneado = Math.max(0, s.cantidadDisponible);
    consolidado[pid].stockTotalPropio += disponibleSaneado;
    consolidado[pid].stockTotalDeudor += Math.max(0, s.cantidadDeudora);
    consolidado[pid].porGalpon.push({
      stockId: s.id,
      proveedor: s.proveedor,
      cantidadDisponible: disponibleSaneado,
      cantidadDeudora: Math.max(0, s.cantidadDeudora),
      cantidadMinima: s.cantidadMinima,
      bajoMinimo: s.cantidadMinima !== null && disponibleSaneado <= s.cantidadMinima,
      tieneSaldoDeudor: s.cantidadDeudora > 0,
    });
  }

  // 4. Agregar productos SIN ningún registro de stock (aparecen con stock = 0)
  for (const prod of productos) {
    if (!consolidado[prod.id]) {
      consolidado[prod.id] = {
        producto: prod,
        stockTotalPropio: 0,
        stockTotalDeudor: 0,
        porGalpon: [],
      };
    }
  }

  // 5. Ordenar: primero los que tienen stock > 0, luego alfabéticamente
  return Object.values(consolidado).sort((a: any, b: any) => {
    if (a.stockTotalPropio > 0 && b.stockTotalPropio === 0) return -1;
    if (a.stockTotalPropio === 0 && b.stockTotalPropio > 0) return 1;
    return a.producto.nombre.localeCompare(b.producto.nombre, 'es');
  });
};

// Stock completo sin consolidar
export const getStockService = async () => {
  const stock = await prisma.stock.findMany({
    include: {
      producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } }
    },
    orderBy: { producto: { nombre: 'asc' } }
  });

  return stock.map(s => ({
    ...s,
    bajoMinimo: s.cantidadMinima !== null && s.cantidadDisponible <= s.cantidadMinima,
    tieneSaldoDeudor: s.cantidadDeudora > 0
  }));
};

// Alertas de stock bajo mínimo
export const getAlertasStockService = async () => {
  const stock = await prisma.stock.findMany({
    where: { cantidadMinima: { not: null } },
    include: {
      producto: { select: { id: true, nombre: true, tipo: true } },
      proveedor: { select: { id: true, nombreEmpresa: true } }
    }
  });

  return stock
    .filter(s => s.cantidadDisponible <= (s.cantidadMinima || 0))
    .map(s => ({
      stockId: s.id,
      producto: s.producto,
      proveedor: s.proveedor,
      cantidadDisponible: s.cantidadDisponible,
      cantidadDeudora: s.cantidadDeudora,
      cantidadMinima: s.cantidadMinima,
      deficit: (s.cantidadMinima || 0) - s.cantidadDisponible
    }));
};

// Movimientos de stock
export const getMovimientosStockService = async (productoId?: number, proveedorId?: number) => {
  const where: any = {};

  if (productoId || proveedorId) {
    const stockConditions: any = {};
    if (productoId) stockConditions.productoId = productoId;
    if (proveedorId) stockConditions.proveedorId = proveedorId;
    where.stock = stockConditions;
  }

  return await prisma.movimientoStock.findMany({
    where,
    include: {
      stock: {
        include: {
          producto: { select: { nombre: true, tipo: true } },
          proveedor: { select: { nombreEmpresa: true } }
        }
      },
      registradoPor: { select: { nombre: true, apellido: true } }
    },
    orderBy: { fecha: 'desc' },
    take: 100
  });
};

// Ajuste manual de stock
export const ajustarStockService = async (
  stockId: number,
  nuevaCantidad: number,
  motivo: string,
  usuarioId: number
) => {
  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) throw new Error('Registro de stock no encontrado');

  // El stock propio nunca puede ser negativo
  const cantidadFinal = Math.max(0, nuevaCantidad);
  const diferencia = cantidadFinal - stock.cantidadDisponible;

  await prisma.stock.update({
    where: { id: stockId },
    data: { cantidadDisponible: cantidadFinal }
  });

  await prisma.movimientoStock.create({
    data: {
      stockId,
      tipoMovimiento: 'ajuste',
      cantidad: Math.abs(diferencia),
      motivo: 'ajuste_manual',
      registradoPorId: usuarioId
    }
  });

  return {
    mensaje: 'Stock ajustado correctamente',
    cantidadAnterior: stock.cantidadDisponible,
    cantidadNueva: cantidadFinal,
    diferencia
  };
};
