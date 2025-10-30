require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const conversationRoutes = require('./routes/conversations');
const actionRoutes = require('./routes/actions');
const ghlRoutes = require('./routes/ghl');
const appointmentRoutes = require('./routes/appointments');
const webhookRoutes = require('./routes/webhooks');
const webhookGHLRoutes = require('./routes/webhook-ghl');
const downloadRoutes = require('./routes/download');
const calendarRoutes = require('./routes/calendar');
const teamRoutes = require('./routes/team');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// Serve static files from public directory
app.use('/public', express.static('public'));

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
app.use('/api/templates', templateRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/ghl', ghlRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhook', webhookGHLRoutes); // GHL webhook receiver
app.use('/api/download', downloadRoutes); // File downloads
app.use('/api/calendar', calendarRoutes); // Calendar booking system
app.use('/api/team', teamRoutes); // Team management

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LeadSync API Server Running',
    mockAI: process.env.USE_MOCK_AI === 'true'
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

// General error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);

  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: 'Something went wrong!',
    message: isDevelopment ? err.message : 'Internal server error',
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