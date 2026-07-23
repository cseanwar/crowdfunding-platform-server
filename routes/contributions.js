const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const { supporter, creator } = require('../middleware/roles');

const router = express.Router();

router.get('/my', auth, supporter, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await db.collection('contributions')
      .countDocuments({ supporter: req.user._id.toString() });
    const contributions = await db.collection('contributions')
      .find({ supporter: req.user._id.toString() })
      .sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

    res.json({ contributions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/to-review', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const contributions = await db.collection('contributions')
      .find({ creator: req.user._id.toString(), status: 'pending' })
      .sort({ createdAt: -1 }).toArray();
    res.json(contributions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/approved', auth, supporter, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const contributions = await db.collection('contributions')
      .find({ supporter: req.user._id.toString(), status: 'approved' })
      .sort({ createdAt: -1 }).toArray();
    res.json(contributions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, supporter, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { campaignId, amount } = req.body;

    const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(campaignId) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
    if (user.credits < amount) return res.status(400).json({ message: 'Insufficient credits' });

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user._id) },
      { $inc: { credits: -amount } }
    );

    const contribution = {
      campaign: campaignId,
      campaignTitle: campaign.title,
      supporter: req.user._id.toString(),
      supporterName: req.user.name,
      supporterEmail: req.user.email,
      creator: campaign.creator,
      creatorName: campaign.creatorName,
      creatorEmail: campaign.creatorEmail,
      amount: Number(amount),
      status: 'pending',
      createdAt: new Date(),
    };
    const result = await db.collection('contributions').insertOne(contribution);

    await db.collection('notifications').insertOne({
      message: `${req.user.name} contributed ${amount} credits to ${campaign.title}`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.status(201).json({ ...contribution, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/approve', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const contribution = await db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.creator !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.collection('contributions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } }
    );
    await db.collection('campaigns').updateOne(
      { _id: new ObjectId(contribution.campaign) },
      { $inc: { raised: contribution.amount } }
    );
    await db.collection('notifications').insertOne({
      message: `Your contribution of ${contribution.amount} credits to ${contribution.campaignTitle} was approved by ${req.user.name}`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter-home',
      createdAt: new Date(),
    });

    res.json({ ...contribution, status: 'approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const contribution = await db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.creator !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.collection('contributions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } }
    );
    await db.collection('users').updateOne(
      { _id: new ObjectId(contribution.supporter) },
      { $inc: { credits: contribution.amount } }
    );
    await db.collection('notifications').insertOne({
      message: `Your contribution of ${contribution.amount} credits to ${contribution.campaignTitle} was rejected by ${req.user.name}`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter-home',
      createdAt: new Date(),
    });

    res.json({ ...contribution, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
