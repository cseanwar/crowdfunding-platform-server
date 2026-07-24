const { ObjectId } = require('mongodb');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const rawToken = header.split(' ')[1];

    const db = req.app.locals.db;

    // Better Auth uses opaque session tokens — look it up in the session collection
    const session = await db.collection('session').findOne({ token: rawToken });
    if (!session) return res.status(401).json({ message: 'Invalid session' });
    if (new Date(session.expiresAt) < new Date()) return res.status(401).json({ message: 'Session expired' });

    const user = await db.collection('user').findOne({ _id: new ObjectId(session.userId) });
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      _id: user._id.toString(),
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'supporter',
      credits: user.credits || 0,
      photo: user.image || '',
    };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
