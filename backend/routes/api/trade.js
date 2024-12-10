const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const { verifyTransactionSignature } = require('../../actions/transaction');
const { createPhantomAccount } = require('../../actions/account');
const { getTokenInfo } = require('../../actions/tokens');

router.post('/getDepositWallets', async (req, res) => {
  try {
    const { wallet } = req.body;
    const isExist = await Trade.findOne({ userWallet: wallet });
    if (!isExist) {
      return res.status(400).json({ msg: 'Trade not found' });
    }
    const { depositWallets } = await Trade.findOne({ userWallet: wallet, depositWallets: { $elemMatch: { isTrading: false } } });
    const depositWalletsArray = depositWallets
    .filter(wallet => !wallet.isTrading) // Filter out wallets that are trading
    .map(wallet => ({
        wallet: wallet.wallet,
        publicKey: wallet.publicKey,
        isTrading: wallet.isTrading
    }));  
    res.json(depositWalletsArray);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/newCreateWallet', async (req, res) => {
  try {
    const { wallet } = req.body;
    console.log('wallet---', wallet);
    const newWallet = await createPhantomAccount();
    const isExist = await Trade.findOne({ userWallet: wallet });
    if (isExist) {
      const tradeInfo = await Trade.findOne({ userWallet: wallet });
      if (tradeInfo.depositWallets.length < process.env.MAX_DEPOSIT_WALLETS) {
        const updateTrade = await Trade.findByIdAndUpdate(tradeInfo._id, {
          $push: { depositWallets: {
            wallet: newWallet.publicKey.toString(),
            publicKey: newWallet.publicKey.toString(),
            secretKey: newWallet.secretKey.toString()
          } }
        });
        console.log('updateTrade---', updateTrade);
        return res.json({ status: true, trade: updateTrade, msg: 'Trade created' });
      } else {
        return res.json({ status: false, trade: [], msg: 'Max deposit wallets reached' });
      }
    }
    const newTrade = await Trade.create({
      userWallet: wallet,
      depositWallets: [{
        wallet: newWallet.publicKey.toString(),
        publicKey: newWallet.publicKey.toString(),
        secretKey: newWallet.secretKey.toString()
      }]
    });
    console.log('newTrade---', newTrade);
    res.json({status: true, trade: newTrade, msg: 'Trade created' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/confirmTransaction', async (req, res) => {
  try {
    const { signature } = req.body;
    console.log('signature', signature);
    const isVerified = await verifyTransactionSignature(signature);
    res.json({ status: isVerified });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/getTokenInfo', async (req, res) => {
  const { wallet } = req.body;
  const tokenInfo = await getTokenInfo(wallet);
  res.json(tokenInfo);
});
module.exports = router;
