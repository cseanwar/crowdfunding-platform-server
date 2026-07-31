const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const { creator, admin } = require('../middleware/roles');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const filter = {};

    // By default filter approved campaigns unless status param passed
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = 'approved';
    }

    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    // Only campaigns whose deadline has not passed
    if (req.query.active === 'true') {
      filter.deadline = { $gte: new Date() };
    }

    if (req.query.paginate === 'false') {
      const allCampaigns = await db.collection('campaigns').find(filter).sort({ raised: -1 }).toArray();
      return res.json(allCampaigns);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 8);
    const skip = (page - 1) * limit;

    const total = await db.collection('campaigns').countDocuments(filter);
    const campaigns = await db.collection('campaigns')
      .find(filter)
      .sort({ raised: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      campaigns,
      total,
      page,
      totalPages,
      limit,
    });
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
      .find({ creator: req.user.id })
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
      creator: req.user.id,
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
    if (campaign.creator !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const update = {};
    if (req.body.title) update.title = req.body.title;
    if (req.body.story) update.story = req.body.story;
    if (req.body.reward) update.reward = req.body.reward;
    if (req.body.category) update.category = req.body.category;
    if (req.body.goal) update.goal = Number(req.body.goal);
    if (req.body.minContribution) update.minContribution = Number(req.body.minContribution);
    if (req.body.deadline) update.deadline = new Date(req.body.deadline);
    if (req.body.image) update.image = req.body.image;
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
    if (req.user.role !== 'admin' && campaign.creator !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const approved = await db.collection('contributions')
      .find({ campaign: req.params.id, status: 'approved' }).toArray();
    for (const c of approved) {
      await db.collection('user').updateOne(
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
    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await db.collection('campaigns').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } }
    );

    await db.collection('notifications').insertOne({
      message: `Your campaign "${campaign.title}" was approved by ${req.user.name}`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.json({ ...campaign, status: 'approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await db.collection('campaigns').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } }
    );

    await db.collection('notifications').insertOne({
      message: `Your campaign "${campaign.title}" was rejected`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.json({ ...campaign, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/suspend', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await db.collection('campaigns').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'suspended' } }
    );

    await db.collection('notifications').insertOne({
      message: `Your campaign "${campaign.title}" was suspended for policy violation`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.json({ ...campaign, status: 'suspended' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
