const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const { creator, admin } = require('../middleware/roles');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const filter = { status: 'approved' };
    if (req.query.category) filter.category = req.query.category;
    const campaigns = await db.collection('campaigns').find(filter)
      .sort({ raised: -1 }).toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/top', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaigns = await db.collection('campaigns').find({ status: 'approved' })
      .sort({ raised: -1 }).limit(6).toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaigns = await db.collection('campaigns')
      .find({ creator: req.user._id.toString() })
      .sort({ deadline: -1 }).toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/pending', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaigns = await db.collection('campaigns').find({ status: 'pending' })
      .sort({ createdAt: -1 }).toArray();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection('campaigns')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const doc = {
      ...req.body,
      creator: req.user._id.toString(),
      creatorName: req.user.name,
      creatorEmail: req.user.email,
      raised: 0,
      status: 'pending',
      createdAt: new Date(),
      deadline: new Date(req.body.deadline),
      goal: Number(req.body.goal),
      minContribution: Number(req.body.minContribution),
    };
    const result = await db.collection('campaigns').insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.creator !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const update = {};
    if (req.body.title) update.title = req.body.title;
    if (req.body.story) update.story = req.body.story;
    if (req.body.reward) update.reward = req.body.reward;
    await db.collection('campaigns').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );
    const updated = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (req.user.role !== 'admin' && campaign.creator !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const approved = await db.collection('contributions')
      .find({ campaign: req.params.id, status: 'approved' }).toArray();
    for (const c of approved) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(c.supporter) },
        { $inc: { credits: c.amount } }
      );
    }
    await db.collection('contributions').deleteMany({ campaign: req.params.id });
    await db.collection('campaigns').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/approve', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.collection('campaigns').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Campaign not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.collection('campaigns').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Campaign not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
