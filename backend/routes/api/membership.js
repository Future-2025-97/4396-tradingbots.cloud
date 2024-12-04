const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Membership = require('../../models/Membership');

router.post('/create', async (req, res) => {
  try {
    const { typeOfMembership, price, period, maxCopyTokens } = req.body;
    const membership = new Membership({ typeOfMembership, price, period, maxCopyTokens });
    await membership.save();
    res.json(membership);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// router.post('/getMemberships', async (req, res) => {
//   try {
//     const memberships = await Membership.find();
//     res.json(memberships);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

module.exports = router;
