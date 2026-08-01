const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const sessionAuth = require('../middleware/sessionAuth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Exchange a valid Better Auth session token for a signed JWT.
// Protects the rest of the API with JWT-based auth.
// NOTE: uses jsonwebtoken (CommonJS) instead of jose (pure ESM) so this file
// loads in Vercel's CommonJS serverless runtime. HS256 signatures are fully
// interoperable with the client's jose-issued tokens.
router.post('/token', sessionAuth, async (req, res) => {
  try {
    const token = jwt.sign(
      {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
