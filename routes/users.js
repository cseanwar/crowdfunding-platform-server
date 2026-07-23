const express = require('express');

const auth = require('../middleware/auth');
const { admin } = require('../middleware/roles');

const router = express.Router();

router.get('/', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = await db.collection('user').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/role', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { role } = req.body;
    const result = await db.collection('user').findOneAndUpdate(
      { id: req.params.id },
      { $set: { role } },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.collection('user').deleteOne({ id: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
