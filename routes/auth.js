const express = require('express');
const { SignJWT } = require('jose');
const auth = require('../middleware/auth');
const sessionAuth = require('../middleware/sessionAuth');

const router = express.Router();

const getKey = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

// Exchange a valid Better Auth session token for a signed JWT.
// Protects the rest of the API with JWT-based auth.
router.post('/token', sessionAuth, async (req, res) => {
  try {
    const token = await new SignJWT({
      id: req.user.id,
      role: req.user.role,
      email: req.user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getKey());

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
