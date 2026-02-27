require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const partyRoutes = require('./routes/parties');
const purchaseRoutes = require('./routes/purchases');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const lotRoutes = require('./routes/lots');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect DB
connectDB();

// Allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:4173', // Vite preview port
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS - must be before all routes
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/lots', lotRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));