const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const { creator, admin } = require('../middleware/roles');

const router = express.Router();

router.get('/my', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const withdrawals = await db.collection('withdrawals')
      .find({ creator: req.user.id })
      .sort({ createdAt: -1 }).toArray();
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/pending', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const withdrawals = await db.collection('withdrawals')
      .find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, creator, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { credits, amount, paymentSystem, account } = req.body;

    const campaigns = await db.collection('campaigns')
      .find({ creator: req.user.id, status: 'approved' }).toArray();
    const totalRaised = campaigns.reduce((sum, c) => sum + c.raised, 0);

    if (totalRaised < 200) return res.status(400).json({ message: 'Minimum 200 credits required' });
    if (credits > totalRaised) return res.status(400).json({ message: 'Insufficient credits' });

    const withdrawal = {
      creator: req.user.id,
      creatorName: req.user.name,
      creatorEmail: req.user.email,
      credits: Number(credits),
      amount: Number(amount),
      paymentSystem,
      account,
      status: 'pending',
      createdAt: new Date(),
    };
    const result = await db.collection('withdrawals').insertOne(withdrawal);
    res.status(201).json({ ...withdrawal, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const withdrawal = await db.collection('withdrawals').findOne({ _id: new ObjectId(req.params.id) });
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    await db.collection('withdrawals').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } }
    );

    await db.collection('notifications').insertOne({
      message: `Your withdrawal request for ${withdrawal.credits} credits ($${withdrawal.amount}) was rejected`,
      toEmail: withdrawal.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.json({ ...withdrawal, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/approve', auth, admin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const withdrawal = await db.collection('withdrawals').findOne({ _id: new ObjectId(req.params.id) });
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    await db.collection('withdrawals').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } }
    );

    const campaigns = await db.collection('campaigns')
      .find({ creator: withdrawal.creator, status: 'approved' }).toArray();
    let remaining = withdrawal.credits;
    for (const campaign of campaigns) {
      if (remaining <= 0) break;
      const deduct = Math.min(campaign.raised, remaining);
      await db.collection('campaigns').updateOne(
        { _id: campaign._id },
        { $inc: { raised: -deduct } }
      );
      remaining -= deduct;
    }

    await db.collection('notifications').insertOne({
      message: `Your withdrawal request for ${withdrawal.credits} credits ($${withdrawal.amount}) was approved`,
      toEmail: withdrawal.creatorEmail,
      actionRoute: '/dashboard/creator-home',
      createdAt: new Date(),
    });

    res.json({ ...withdrawal, status: 'approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
