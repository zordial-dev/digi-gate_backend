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
import organisationUsersRoutes from './routes/organisationUsers.js';
import selfiesRoutes from './routes/selfies.js';
import visitsRoutes from './routes/visits.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware & Routes Config (Support up to 10MB for base64 uploads)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Selfie Database Proxy Routes (raw bytes from PostgreSQL bytea, NO disk access)
app.use('/selfies', selfiesRoutes);
app.use('/api/selfies', selfiesRoutes);
// Host static asset directories (/public, /logos, etc. - /selfies is served via DB proxy above)
const publicDir = path.join(__dirname, '../public');
app.use('/public', express.static(publicDir));
app.use('/logos', express.static(path.join(publicDir, 'logos')));
app.use('/hosts', express.static(path.join(publicDir, 'hosts')));
app.use('/profiles', express.static(path.join(publicDir, 'profiles')));
app.use('/organisations', express.static(path.join(publicDir, 'organisations')));
app.use(express.static(publicDir));
// Auth & Admin Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminRoutes);
// Organisation User Routes (Manage Admins in Organisation Portal)
app.use('/api/organisation/users', organisationUsersRoutes);
app.use('/organisation/users', organisationUsersRoutes);
// Visits Routes (POST /visits with selfie_base64 in transaction)
app.use('/visits', visitsRoutes);
app.use('/api/visits', visitsRoutes);
// Other API Routes
app.use('/api/hosts', hostRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/visitor-visits', visitorVisitsRoutes);
app.use('/visitor-visits', visitorVisitsRoutes);
// 404 handler
app.use((_, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});
// Keep-alive timer to prevent Node event loop from closing prematurely
setInterval(() => { }, 1000 * 60 * 60);
// Start server
const startServer = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        await sequelize.sync();
        console.log('✅ Database synchronized successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
    }
};
startServer();
