const express = require('express');
const { ObjectId } = require('mongodb');

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

router.get('/me', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = await db.collection('user').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/me', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updates = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      updates.name = req.body.name.trim();
    }
    if (typeof req.body.image === 'string' && req.body.image.trim()) {
      updates.image = req.body.image.trim();
    }
    const result = await db.collection('user').findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      { $set: updates },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/role', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { role } = req.body;
    const result = await db.collection('user').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
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
    await db.collection('user').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
