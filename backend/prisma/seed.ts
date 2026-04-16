import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Creando usuarios iniciales...');

  const passwordCarlos = await bcrypt.hash('woodpallet_carlos_2026', 10);
  const passwordJuanCruz = await bcrypt.hash('woodpallet_juancruz_2026', 10);

  const carlos = await prisma.usuario.upsert({
    where: { email: 'carlos@woodpallet.com' },
    update: {},
    create: {
      nombre: 'Carlos Horacio',
      apellido: 'Benítez',
      email: 'carlos@woodpallet.com',
      passwordHash: passwordCarlos,
      rol: 'propietario_carlos',
      telefono: '1130058664',
    },
  });

  const juanCruz = await prisma.usuario.upsert({
    where: { email: 'juancruz@woodpallet.com' },
    update: {},
    create: {
      nombre: 'Juan Cruz',
      apellido: 'Benítez',
      email: 'juancruz@woodpallet.com',
      passwordHash: passwordJuanCruz,
      rol: 'propietario_juancruz',
      telefono: '1166231866',
    },
  });

  console.log('Usuarios creados:');
  console.log(`  Carlos: ${carlos.email} / contraseña: woodpallet_carlos_2026`);
  console.log(`  Juan Cruz: ${juanCruz.email} / contraseña: woodpallet_juancruz_2026`);

  // Crear proveedores
  console.log('Creando proveedores...');

  const brian = await prisma.proveedor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombreEmpresa: 'Galpón Familiar — Brian Hernández',
      nombreContacto: 'Brian Nahuel Hernández',
      telefono: '1155556666',
      tipoProducto: 'seminuevo',
      distanciaKm: 15,
    },
  });

  const todoPallets = await prisma.proveedor.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombreEmpresa: 'Todo Pallets',
      nombreContacto: 'Guillermo',
      telefono: '1144443333',
      tipoProducto: 'nuevo_medida',
      contactoExclusivoId: carlos.id,
      distanciaKm: 15,
    },
  });

  // Crear productos
  console.log('Creando productos...');

  const palletReforzado = await prisma.producto.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Pallet Reforzado',
      tipo: 'reforzado',
      condicion: 'seminuevo',
      dimensionLargo: 1200,
      dimensionAncho: 1000,
      cargaMaximaKg: 1500,
      requiereSenasa: false,
    },
  });

  const palletLiviano = await prisma.producto.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombre: 'Pallet Liviano',
      tipo: 'liviano',
      condicion: 'seminuevo',
      dimensionLargo: 1200,
      dimensionAncho: 1000,
      cargaMaximaKg: 1000,
      requiereSenasa: false,
    },
  });

  const palletExportacion = await prisma.producto.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nombre: 'Pallet Exportación',
      tipo: 'exportacion',
      condicion: 'nuevo',
      dimensionLargo: 1200,
      dimensionAncho: 1000,
      cargaMaximaKg: 1500,
      requiereSenasa: true,
    },
  });

  // Crear lista de precios con escalones
  console.log('Creando lista de precios...');

  // Eliminar precios anteriores para evitar duplicados en re-seeds
  await prisma.listaPrecio.deleteMany({
    where: { productoId: { in: [palletReforzado.id, palletLiviano.id] } },
  });

  const escalonesReforzado = [
    { cantMinima: 1,    cantMaxima: 249  as number | null, precio: 5500, bonificaFlete: false },
    { cantMinima: 250,  cantMaxima: 399  as number | null, precio: 5200, bonificaFlete: true  },
    { cantMinima: 400,  cantMaxima: 999  as number | null, precio: 4900, bonificaFlete: true  },
    { cantMinima: 1000, cantMaxima: null as number | null, precio: 4500, bonificaFlete: true  },
  ];

  const escalonesLiviano = [
    { cantMinima: 1,    cantMaxima: 249  as number | null, precio: 3850, bonificaFlete: false },
    { cantMinima: 250,  cantMaxima: 399  as number | null, precio: 3600, bonificaFlete: true  },
    { cantMinima: 400,  cantMaxima: 999  as number | null, precio: 3400, bonificaFlete: true  },
    { cantMinima: 1000, cantMaxima: null as number | null, precio: 3100, bonificaFlete: true  },
  ];

  for (const e of escalonesReforzado) {
    await prisma.listaPrecio.create({
      data: {
        productoId: palletReforzado.id,
        precioUnitario: e.precio,
        cantMinima: e.cantMinima,
        cantMaxima: e.cantMaxima,
        bonificaFlete: e.bonificaFlete,
        creadoPorId: juanCruz.id,
      },
    });
  }

  for (const e of escalonesLiviano) {
    await prisma.listaPrecio.create({
      data: {
        productoId: palletLiviano.id,
        precioUnitario: e.precio,
        cantMinima: e.cantMinima,
        cantMaxima: e.cantMaxima,
        bonificaFlete: e.bonificaFlete,
        creadoPorId: juanCruz.id,
      },
    });
  }

  // Crear stock inicial
  console.log('Creando stock inicial...');

  await prisma.stock.upsert({
    where: { productoId_proveedorId: { productoId: palletReforzado.id, proveedorId: brian.id } },
    update: {},
    create: { productoId: palletReforzado.id, proveedorId: brian.id, cantidadDisponible: 150, cantidadMinima: 50 },
  });

  await prisma.stock.upsert({
    where: { productoId_proveedorId: { productoId: palletLiviano.id, proveedorId: brian.id } },
    update: {},
    create: { productoId: palletLiviano.id, proveedorId: brian.id, cantidadDisponible: 80, cantidadMinima: 30 },
  });

  await prisma.stock.upsert({
    where: { productoId_proveedorId: { productoId: palletExportacion.id, proveedorId: todoPallets.id } },
    update: {},
    create: { productoId: palletExportacion.id, proveedorId: todoPallets.id, cantidadDisponible: 200, cantidadMinima: 50 },
  });

  console.log('Proveedores, productos, precios y stock creados.');
  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
