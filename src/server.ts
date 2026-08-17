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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Host ALL public files - This makes /organisations/logo.png work
app.use('/', express.static(path.join(__dirname, '../public')));

// Or if you want to keep it under /public:
// app.use('/public', express.static(path.join(__dirname, '../public')));

// Add this import
import adminRoutes from './routes/admin.js';

// Add this after other routes
app.use('/api/admin', adminRoutes);

// Routes

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

// Start server
const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

startServer();