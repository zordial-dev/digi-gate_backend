import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';
import organisationsRoutes from './routes/organisations.js';
import visitorsRoutes from './routes/visitors.js';
import visitorVisitsRoutes from './routes/visitorVisits.js';
import hostRoutes from './routes/hosts.js';
import adminRoutes from './routes/admin.js';
import adminUsersRoutes from './routes/adminUsers.js';
import authRoutes from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware & Routes Config
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Host ALL static asset directories (/selfies, /public, /logos, etc.)
const publicDir = path.join(__dirname, '../public');
app.use('/public', express.static(publicDir));
app.use('/selfies', express.static(path.join(publicDir, 'selfies')));
app.use('/logos', express.static(path.join(publicDir, 'logos')));
app.use('/hosts', express.static(path.join(publicDir, 'hosts')));
app.use('/profiles', express.static(path.join(publicDir, 'profiles')));
app.use('/organisations', express.static(path.join(publicDir, 'organisations')));
app.use(express.static(publicDir));

// Auth & Admin Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminRoutes);

// Other API Routes
app.use('/api/hosts', hostRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/visitor-visits', visitorVisitsRoutes);

// 404 handler
app.use((_, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: any, res: any, _next: any) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

// Keep-alive timer to prevent Node event loop from closing prematurely
setInterval(() => {}, 1000 * 60 * 60);

// Start server
const startServer = async (): Promise<void> => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');

  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

startServer();