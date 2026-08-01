const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.split(' ')[1];

    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    const db = req.app.locals.db;
    const user = await db.collection('user').findOne({ _id: new ObjectId(payload.id) });
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
    console.error('JWT auth error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
