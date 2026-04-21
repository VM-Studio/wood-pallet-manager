/**
 * Script de limpieza de datos de prueba.
 * Borra TODOS los datos de negocio pero mantiene los usuarios propietarios.
 * NO modifica la estructura de la base de datos ni ninguna funcionalidad.
 *
 * Uso: npx ts-node --project tsconfig.json prisma/clean-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanData() {
  console.log('🧹 Iniciando limpieza de datos de prueba...\n')

  // El orden importa por las FK constraints — de más dependiente a menos dependiente

  console.log('  Borrando pagos a proveedores...')
  const pp = await prisma.pagoProveedor.deleteMany()
  console.log(`    ✓ ${pp.count} registros`)

  console.log('  Borrando notas de crédito...')
  const nc = await prisma.notaCredito.deleteMany()
  console.log(`    ✓ ${nc.count} registros`)

  console.log('  Borrando cobros/pagos...')
  const pc = await prisma.pagoCobro.deleteMany()
  console.log(`    ✓ ${pc.count} registros`)

  console.log('  Borrando retiros parciales...')
  const rp = await prisma.retiroParcial.deleteMany()
  console.log(`    ✓ ${rp.count} registros`)

  console.log('  Borrando facturas...')
  const fa = await prisma.factura.deleteMany()
  console.log(`    ✓ ${fa.count} registros`)

  console.log('  Borrando solicitudes de logística...')
  const sl = await prisma.solicitudLogistica.deleteMany()
  console.log(`    ✓ ${sl.count} registros`)

  console.log('  Borrando logísticas...')
  const lo = await prisma.logistica.deleteMany()
  console.log(`    ✓ ${lo.count} registros`)

  console.log('  Borrando movimientos de stock...')
  const ms = await prisma.movimientoStock.deleteMany()
  console.log(`    ✓ ${ms.count} registros`)

  console.log('  Borrando detalles de compra...')
  const dc2 = await prisma.detalleCompra.deleteMany()
  console.log(`    ✓ ${dc2.count} registros`)

  console.log('  Borrando compras...')
  const co = await prisma.compra.deleteMany()
  console.log(`    ✓ ${co.count} registros`)

  console.log('  Borrando especificaciones a medida...')
  const em = await prisma.especificacionMedida.deleteMany()
  console.log(`    ✓ ${em.count} registros`)

  console.log('  Borrando detalles de venta...')
  const dv = await prisma.detalleVenta.deleteMany()
  console.log(`    ✓ ${dv.count} registros`)

  console.log('  Borrando ventas...')
  const ve = await prisma.venta.deleteMany()
  console.log(`    ✓ ${ve.count} registros`)

  console.log('  Borrando seguimientos de cotización...')
  const sc = await prisma.seguimientoCotizacion.deleteMany()
  console.log(`    ✓ ${sc.count} registros`)

  console.log('  Borrando detalles de cotización...')
  const dc = await prisma.detalleCotizacion.deleteMany()
  console.log(`    ✓ ${dc.count} registros`)

  console.log('  Borrando cotizaciones...')
  const cot = await prisma.cotizacion.deleteMany()
  console.log(`    ✓ ${cot.count} registros`)

  console.log('  Borrando clientes...')
  const cl = await prisma.cliente.deleteMany()
  console.log(`    ✓ ${cl.count} registros`)

  console.log('  Borrando stock...')
  const st = await prisma.stock.deleteMany()
  console.log(`    ✓ ${st.count} registros`)

  console.log('  Borrando producto_proveedor...')
  const ppr = await prisma.productoProveedor.deleteMany()
  console.log(`    ✓ ${ppr.count} registros`)

  console.log('  Borrando proveedores...')
  const pv = await prisma.proveedor.deleteMany()
  console.log(`    ✓ ${pv.count} registros`)

  console.log('  Borrando historial de precios...')
  const hp = await prisma.historialPrecio.deleteMany()
  console.log(`    ✓ ${hp.count} registros`)

  console.log('  Borrando lista de precios...')
  const lp = await prisma.listaPrecio.deleteMany()
  console.log(`    ✓ ${lp.count} registros`)

  console.log('  Borrando productos...')
  const pr = await prisma.producto.deleteMany()
  console.log(`    ✓ ${pr.count} registros`)

  // Verificar que los usuarios quedaron intactos
  const usuarios = await prisma.usuario.findMany({ select: { id: true, email: true, rol: true } })
  console.log(`\n✅ Limpieza completa. Usuarios preservados (${usuarios.length}):`)
  usuarios.forEach(u => console.log(`   - [${u.id}] ${u.email} (${u.rol})`))
  console.log('\n🎉 Base de datos limpia y lista para producción.\n')
}

cleanData()
  .catch(e => {
    console.error('❌ Error durante la limpieza:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
