const express = require('express');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');

const router = express.Router();

const CREDIT_PACKAGES = {
  '100': { credits: 100, amount: 10 },
  '300': { credits: 300, amount: 25 },
  '800': { credits: 800, amount: 60 },
  '1500': { credits: 1500, amount: 110 },
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return require('stripe')(secretKey);
}

router.get('/packages', (req, res) => {
  res.json(CREDIT_PACKAGES);
});

router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { package: pkg } = req.body;
    const selected = CREDIT_PACKAGES[pkg];
    if (!selected) return res.status(400).json({ message: 'Invalid package' });

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selected.amount * 100,
      currency: 'usd',
      metadata: {
        userId: req.user.id,
        credits: selected.credits.toString(),
        package: pkg,
      },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/confirm', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { stripeId, package: pkg } = req.body;
    const selected = CREDIT_PACKAGES[pkg];
    if (!selected) return res.status(400).json({ message: 'Invalid package' });

    const existing = await db.collection('payments').findOne({ stripeId });
    if (existing) return res.status(400).json({ message: 'Payment already processed' });

    // Verify with Stripe that this payment actually succeeded for this user/package
    let intent;
    try {
      const stripe = getStripe();
      intent = await stripe.paymentIntents.retrieve(stripeId);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid payment id' });
    }

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }
    if (intent.metadata?.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (intent.amount !== selected.amount * 100) {
      return res.status(400).json({ message: 'Payment amount mismatch' });
    }

    await db.collection('payments').insertOne({
      user: req.user.id,
      package: pkg,
      credits: selected.credits,
      amount: selected.amount,
      stripeId,
      createdAt: new Date(),
    });

    await db.collection('user').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $inc: { credits: selected.credits } }
    );

    res.json({ credits: selected.credits, message: `Added ${selected.credits} credits` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const payments = await db.collection('payments')
      .find({ user: req.user.id })
      .sort({ createdAt: -1 }).toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
