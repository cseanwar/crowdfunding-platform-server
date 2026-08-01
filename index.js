require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const contributionRoutes = require('./routes/contributions');
const withdrawalRoutes = require('./routes/withdrawals');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

const app = express();

const localOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const clientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: [...localOrigins, ...clientOrigins],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());

// Cache the Mongo connection across serverless invocations (Vercel reuses the
// same lambda instance for warm calls). Never process.exit() — that kills the
// function. Fail requests with a 500 instead.
let dbPromise;
function connectDb() {
  if (!dbPromise) {
    if (!process.env.MONGODB_URI) {
      dbPromise = Promise.reject(new Error('MONGODB_URI is not set'));
    } else {
      dbPromise = MongoClient.connect(process.env.MONGODB_URI)
        .then((client) => {
          const db = client.db(process.env.DB_NAME || 'crowdfunding');
          db.once?.('close', () => { dbPromise = null; });
          return db;
        });
    }
  }
  return dbPromise;
}

// Guarantee req.app.locals.db is set before any route handler runs.
app.use(async (req, res, next) => {
  try {
    req.app.locals.db = await connectDb();
    next();
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ message: 'Database unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/debug-auth', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.json({ authenticated: false, reason: 'No Bearer token' });
  }
  const rawToken = header.split(' ')[1];
  const db = req.app.locals.db;
  const session = await db.collection('session').findOne({ token: rawToken });
  if (!session) return res.json({ authenticated: false, reason: 'Session not found' });
  const user = await db.collection('user').findOne({ _id: new (require('mongodb').ObjectId)(session.userId) });
  res.json({
    authenticated: true,
    tokenPreview: rawToken.substring(0, 20) + '...',
    sessionId: session._id.toString(),
    userName: user?.name,
    userRole: user?.role,
  });
});

// Vercel serverless: export the app instead of calling app.listen().
// The PORT branch is only used when running locally (node index.js).
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
