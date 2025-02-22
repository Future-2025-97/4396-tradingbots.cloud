const express = require('express');
const router = express.Router();
const Membership = require('../../models/Membership');
const { verifyTransactionSignature } = require('../../actions/transaction');
const { PublicKey } = require('@solana/web3.js');
const User = require('../../models/User');

router.post('/create', async (req, res) => {
  try {
    const { typeOfMembership, price, period, maxCopyTokens, name, maxBots } = req.body;
    const membership = new Membership({ typeOfMembership, price, period, maxCopyTokens, name, maxBots });
    await membership.save();
    res.json(membership);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/update', async (req, res) => {
  try {
    const { id, typeOfMembership, price, period, maxCopyTokens, name, maxBots } = req.body;
    const membership = await Membership.findByIdAndUpdate(id, { typeOfMembership, price, period, maxCopyTokens, name, maxBots });
    res.json(membership);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    await Membership.findByIdAndDelete(id);
    res.json({ msg: 'Membership deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.get('/getMemberships', async (req, res) => {
  try {
    const memberships = await Membership.find();
    const updatedMemberships = memberships.sort((a, b) => a.typeOfMembership - b.typeOfMembership);
    res.json(updatedMemberships);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/update-membership', async (req, res) => {
  try {
    const { account, membershipId, signature } = req.body;
    console.log(req.body);
    const txInfo = await verifyTransactionSignature(signature);
    const senderPublicKey = txInfo.transaction.message.accountKeys[0];
    const accountPublicKey = new PublicKey(account);
    const paymentDate = new Date();

    if (senderPublicKey.equals(accountPublicKey)) {
      await User.findOneAndUpdate({ userWallet: account }, { $set: { membership: membershipId, paymentDate: paymentDate } })
      const user = await User.findOne({ userWallet: account }).populate('membership');
      res.json({ user });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
