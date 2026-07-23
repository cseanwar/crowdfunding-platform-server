const { jwtVerify } = require('jose');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const db = req.app.locals.db;
    const user = await db.collection('user').findOne({ id: payload.sub });
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'supporter',
      credits: user.credits || 0,
      photo: user.image || '',
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
