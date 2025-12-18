require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const templateRoutes = require('./routes/templates');
const conversationRoutes = require('./routes/conversations');
const actionRoutes = require('./routes/actions');
const leadConnectorRoutes = require('./routes/ghl'); // Keep filename as ghl.js for now, will rename later
const appointmentRoutes = require('./routes/appointments');
const webhookRoutes = require('./routes/webhooks');
const webhookGHLRoutes = require('./routes/webhook-ghl');
const ghlWebhookMessageRoutes = require('./routes/ghl-webhook-message');
const downloadRoutes = require('./routes/download');
const calendarRoutes = require('./routes/calendar');
const teamRoutes = require('./routes/team');
const copilotRoutes = require('./routes/copilot');
const snapshotsRoutes = require('./routes/snapshots');
const testAIRoutes = require('./routes/test-ai');
const leadsRoutes = require('./routes/leads');
const bookingRoutes = require('./routes/booking');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const organizationRoutes = require('./routes/organizations');
const oauthRoutes = require('./routes/oauth');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy (required for Render, Railway, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(cors());

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve static files from public directory
app.use('/public', express.static('public'));

// Serve uploaded files (profile pictures, banners, etc.)
app.use('/uploads', express.static('uploads'));

// Parse JSON bodies with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      console.error('Raw body:', buf.toString());
      throw new Error('Invalid JSON');
    }
  }
}));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Log all incoming requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('Content-Type:', req.get('Content-Type'));
    }
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes); // Password reset routes
app.use('/api/templates', templateRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/leadconnector', leadConnectorRoutes);
// Backward compatibility - redirect old /api/ghl requests
app.use('/api/ghl', leadConnectorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhook', webhookGHLRoutes); // GHL webhook receiver
app.use('/api/webhook/ghl', ghlWebhookMessageRoutes); // GHL message webhook (AppointWise style)
app.use('/api/download', downloadRoutes); // File downloads
app.use('/api/calendar', calendarRoutes); // Calendar booking system
app.use('/api/team', teamRoutes); // Team management
app.use('/api/copilot', copilotRoutes); // Co-Pilot website scanning
app.use('/api/snapshots', snapshotsRoutes); // Snapshot management
app.use('/api/test-ai', testAIRoutes); // Test AI conversations
app.use('/api/leads', leadsRoutes); // Lead management
app.use('/api/booking', bookingRoutes); // Public booking widget
app.use('/api/analytics', analyticsRoutes); // Analytics dashboard
app.use('/api/ai', aiRoutes); // AI chat endpoint for Make.com
app.use('/api/organizations', organizationRoutes); // Multi-tenant organizations
app.use('/api/oauth', oauthRoutes); // OAuth callbacks (GHL marketplace)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    commit: 'aa3580c',
    dbType: process.env.DB_TYPE || 'sqlite',
    fixes: 'message-type-detection-fixed',
    message: 'LeadSync API Server Running'
  });
});

// Database health check
app.get('/api/health/database', async (req, res) => {
  try {
    const { getDatabaseInfo } = require('./config/database-postgres');
    const dbInfo = await getDatabaseInfo();
    res.json(dbInfo);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    console.error('Request path:', req.path);
    console.error('Request headers:', req.headers);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: err.message
    });
  }
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    stack: isDevelopment ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Mock AI: ${process.env.USE_MOCK_AI === 'true' ? 'ENABLED' : 'DISABLED'}`);

  // Log all registered routes
  console.log('\n📋 Registered Routes:');
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ').toUpperCase()
      });
    } else if (middleware.name === 'router') {
      // Routes registered through a router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace('^', '');
          routes.push({
            path: path + handler.route.path,
            methods: Object.keys(handler.route.methods).join(', ').toUpperCase()
          });
        }
      });
    }
  });

  routes.forEach(route => {
    console.log(`   ${route.methods.padEnd(10)} ${route.path}`);
  });
  console.log('');
});
