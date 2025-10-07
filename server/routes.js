const express = require('express');
const router = express.Router();
const { getCollection, ObjectId } = require('./db');
const { runSimulation, generateReportHtml } = require('./utils');

// POST /api/simulate
router.post('/simulate', (req, res) => {
  try {
    const input = req.body;
    const result = runSimulation(input);
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// CRUD for scenarios
router.post('/scenarios', async (req, res) => {
  try {
    const col = await getCollection();
    if (!col) return res.status(500).json({ ok: false, error: 'DB not configured' });
    const input = req.body;
    // compute simulation server-side to include results in saved document
    const result = runSimulation(input);
    const doc = { ...input, ...result, createdAt: new Date() };
    const r = await col.insertOne(doc);
    res.json({ ok: true, id: r.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/scenarios', async (req, res) => {
  try {
    const col = await getCollection();
    if (!col) return res.json({ ok: true, scenarios: [] });
    const items = await col.find({}).sort({ createdAt: -1 }).toArray();
    res.json({ ok: true, scenarios: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/scenarios/:id', async (req, res) => {
  try {
    const col = await getCollection();
    if (!col) return res.status(500).json({ ok: false, error: 'DB not configured' });
    const id = req.params.id;
    const doc = await col.findOne({ _id: ObjectId(id) });
    res.json({ ok: true, scenario: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/scenarios/:id', async (req, res) => {
  try {
    const col = await getCollection();
    if (!col) return res.status(500).json({ ok: false, error: 'DB not configured' });
    const id = req.params.id;
    await col.deleteOne({ _id: ObjectId(id) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// report generation - requires email
router.post('/report/generate', async (req, res) => {
  try {
    const { email, input, format } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });
    const result = runSimulation(input);
    const html = generateReportHtml(input, result, email);

    if (format === 'pdf') {
      // generate PDF and send as attachment
      const { htmlToPdfBuffer } = require('./pdf-util');
      const buffer = await htmlToPdfBuffer(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="roi-report.pdf"`);
      return res.send(buffer);
    }

    res.json({ ok: true, html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
