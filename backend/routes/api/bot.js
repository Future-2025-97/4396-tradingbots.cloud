const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const Bot = require('../../models/Bot');
const { swapTokens } = require('../../actions/swap');
const { createPhantomAccount } = require('../../actions/account');

router.post('/createTradingBot', async (req, res) => {
  try {
    const { 
      userWallet, 
      tradeWallet, 
      targetWallet,
      depositValue,
      takeProfit,
      isTakeProfit,
      stopLoss,
      isStopLoss,
      createdTime
     } = req.body;
     
     const isExist = await User.findOne({ userWallet: userWallet });
     if (!isExist) {
      return res.status(400).json({ msg: 'User not found' });
     }

     const trade = await Trade.findOne({ 'depositWallets.wallet': tradeWallet.value }, { depositWallets: 1 });
     await Trade.updateOne({ 'depositWallets.wallet': tradeWallet.value }, { $set: { 'isTrading': true } });

     const matchingWallets = trade ? trade.depositWallets.filter(wallet => wallet.wallet === tradeWallet.value) : [];

     if (!matchingWallets.length) {
      return res.status(400).json({ msg: 'Trade wallet not found' });
     }
     
     const secretKey = matchingWallets[0].secretKey;
     console.log(stopLoss, isStopLoss);
     const bot = new Bot({
      userWallet: userWallet,
      tradeWallet: tradeWallet.value,
      targetWallet: targetWallet,
      depositValue: depositValue,
      takeProfit: takeProfit,
      isTakeProfit: isTakeProfit,
      stopLoss: stopLoss,
      isStopLoss: isStopLoss,
      createdTime: createdTime,
      secretKey: secretKey
     })
     await bot.save();
     res.json(bot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/getTradingBots', async (req, res) => {
  try {
    const { wallet } = req.body;
    const bots = await Bot.find({ userWallet: wallet });
    res.json(bots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/getTransactions', async (req, res) => {
  try {
    const { botId } = req.body;
    const bot = await Bot.findById(botId).sort({ createdAt: -1 });
    console.log('bot', bot.targetTx);
    const txs = bot.targetTx.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(txs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/saveNewTransactions', async (req, res) => {
  try {
    const { botId, transactions } = req.body;

    const bot = await Bot.findById(botId);

    if (Array.isArray(transactions)) {
      transactions.forEach(transaction => {
        const exists = bot.targetTx.some(existingTx => existingTx.signature === transaction.signature);
        if (!exists) {
          const newTransaction = {
            signature: transaction.signature,
            status: transaction.status,
            type: transaction.type,
            tokenAddressA: transaction.tokenAddressA,
            tokenAddressB: transaction.tokenAddressB,
            tokenAmountA: transaction.tokenAmountA,
            tokenAmountB: transaction.tokenAmountB,
            tokenDecimalsA: transaction.tokenDecimalsA,
            tokenDecimalsB: transaction.tokenDecimalsB,
          };
          bot.targetTx.push(newTransaction);
        }
      });
    } else {
      return res.status(400).json({ msg: 'Transactions should be an array' });
    }
    await bot.save();
    res.json(bot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/swap', async (req, res) => {
  const { tokenA, tokenB, amountA, decimalsA, decimalsB } = req.body;
  // console.log('tokenA, tokenB, amountA', tokenA, tokenB, amountA);
  const swap = await swapTokens(tokenA, tokenB, amountA, decimalsA, decimalsB);
  res.json({ msg: 'swap' });
});
  
module.exports = router;
