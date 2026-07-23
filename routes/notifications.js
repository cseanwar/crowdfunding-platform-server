const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const notifications = await db.collection('notifications')
      .find({ toEmail: req.user.email })
      .sort({ createdAt: -1 }).toArray();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
