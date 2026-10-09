import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'digigate_jwt_secret_key_2026';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ success: false, error: 'Access denied. No authentication token provided.' });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, error: 'Invalid or expired token.' });
    }
};
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Permission denied. Insufficient role.' });
            return;
        }
        next();
    };
};
