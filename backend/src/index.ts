import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import clientesRoutes from './routes/clientes.routes';
import productosRoutes from './routes/productos.routes';
import cotizacionesRoutes from './routes/cotizaciones.routes';
import ventasRoutes from './routes/ventas.routes';
import comprasRoutes from './routes/compras.routes';
import inventarioRoutes from './routes/inventario.routes';
import logisticaRoutes from './routes/logistica.routes';
import facturacionRoutes from './routes/facturacion.routes';
import reportesRoutes from './routes/reportes.routes';
import alertasRoutes from './routes/alertas.routes';
import solicitudesLogisticaRoutes from './routes/solicitudes-logistica.routes';
import { iniciarTareasProgramadas } from './utils/cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/facturas', facturacionRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/solicitudes-logistica', solicitudesLogisticaRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'WoodPallet Manager API funcionando',
    version: '1.0.0',
    modulos: [
      'auth', 'clientes', 'productos', 'cotizaciones',
      'ventas', 'compras', 'inventario', 'logistica',
      'facturas', 'reportes', 'alertas',
    ],
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: `Ruta no encontrada` });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 WoodPallet Manager API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
  iniciarTareasProgramadas();
});

export default app;
