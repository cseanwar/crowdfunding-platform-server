const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const { supporter, admin } = require('../middleware/roles');

const router = express.Router();

router.post('/', auth, supporter, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { campaignId, reason } = req.body;
    const report = {
      campaign: campaignId,
      reporter: req.user._id.toString(),
      reason,
      createdAt: new Date(),
    };
    const result = await db.collection('reports').insertOne(report);
    res.status(201).json({ ...report, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const reports = await db.collection('reports').find()
      .sort({ createdAt: -1 }).toArray();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.collection('reports').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
