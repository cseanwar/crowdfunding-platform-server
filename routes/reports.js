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
      reporter: req.user.id,
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

    const populated = await Promise.all(reports.map(async (report) => {
      let reporterName = 'Unknown';
      let campaignTitle = 'Unknown';
      let campaign = null;
      try {
        const reporter = await db.collection('user').findOne({ _id: new ObjectId(report.reporter) });
        if (reporter) reporterName = reporter.name;
      } catch (e) { /* ignore */ }
      try {
        campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(report.campaign) });
        if (campaign) campaignTitle = campaign.title;
      } catch (e) { /* ignore */ }
      return { ...report, reporterName, campaignTitle, campaign };
    }));

    res.json(populated);
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
