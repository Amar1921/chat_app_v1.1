import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection } from './models/db.js';
import authRoutes from './routes/auth.js';
import conversationsRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import statsRoutes from './routes/stats.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== CONFIGURATION ====================
const config = {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  },
  rateLimit: {
    standard: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
      message: { error: 'Trop de requêtes, réessayez plus tard.' },
      standardHeaders: true,
      legacyHeaders: false,
    },
    chat: {
      windowMs: 60 * 1000, // 1 minute
      max: 30,
      message: { error: 'Trop de requêtes chat, réessayez dans une minute.' },
      standardHeaders: true,
      legacyHeaders: false,
    },
  },
  json: {
    limit: '10mb',
    parameterLimit: 10000,
  },
};

// ==================== MIDDLEWARES ====================

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors(config.cors));
app.options('*', cors(config.cors)); // Preflight requests

// Request logging in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Rate limiting
app.use('/api', rateLimit(config.rateLimit.standard));
app.use('/api/chat', rateLimit(config.rateLimit.chat));

// Body parsing
app.use(express.json(config.json));
app.use(express.urlencoded({ extended: true, limit: config.json.limit }));

// ==================== ROUTES ====================

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

// API Routes
const apiRoutes = [
  { path: '/api/auth', router: authRoutes },
  { path: '/api/conversations', router: conversationsRoutes },
  { path: '/api/chat', router: chatRoutes },
  { path: '/api/stats', router: statsRoutes },
];

apiRoutes.forEach(({ path, router }) => {
  app.use(path, router);
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
  });
});

// ==================== ERROR HANDLING ====================

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Erreur serveur interne';

  // Log error with details in development
  if (NODE_ENV === 'development') {
    console.error('❌ Error:', {
      timestamp: new Date().toISOString(),
      status,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });
  } else {
    // Production logging (without sensitive data)
    console.error(`❌ Error ${status}: ${message} - ${req.method} ${req.path}`);
  }

  // Send appropriate error response
  res.status(status).json({
    error: message,
    status,
    ...(NODE_ENV === 'development' && { stack: err.stack, details: err.details }),
  });
});

// ==================== SERVER START ====================

async function startServer() {
  try {
    // Test database connection
    console.log('📦 Testing database connection...');
    const dbOk = await testConnection();

    if (!dbOk) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database connection successful');

    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 Server is running!`);
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`📍 Frontend URL: ${config.cors.origin}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log('\n📡 Available endpoints:');
      apiRoutes.forEach(({ path }) => {
        console.log(`   - ${path}`);
      });
      console.log('\n⚡ Server ready to accept connections\n');
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('\n🔄 Received shutdown signal, closing server...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('\n❌ Failed to start server:');
    console.error(`   Error: ${error.message}`);

    if (error.code === 'EADDRINUSE') {
      console.error(`   Port ${PORT} is already in use. Try:`);
      console.error(`   - Killing the process using port ${PORT}`);
      console.error(`   - Changing the PORT in .env file`);
    } else if (error.message.includes('database')) {
      console.error('\n📦 Database configuration:');
      console.error('   Please check your .env file and ensure:');
      console.error('   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are correct');
      console.error('   - Database server is running');
    }

    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();