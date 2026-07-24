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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());

MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    app.locals.db = client.db(process.env.DB_NAME || 'crowdfunding');
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
