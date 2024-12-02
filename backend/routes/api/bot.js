const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const Bot = require('../../models/Bot');
const { createPhantomAccount } = require('../../actions/account');
const { detectWallet, mainWorking } = require('../../actions/main');
const { sendToken } = require('../../actions/tokens');
const { token } = require('@coral-xyz/anchor/dist/cjs/utils');

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
router.post('/sendToken', async (req, res) => {
  const { amount, token, recipient } = req.body;
  const response = await sendToken(amount, token, recipient);
  res.json(response);
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

router.post('/sendSignal', async (req, res) => {
  const { wallet } = req.body;
  const bot = await Bot.findOne({ tradeWallet: wallet });

  const { copyDetectResult, pasteDetectResult, safe } = await detectWallet(wallet, bot.targetWallet, bot.secretKey);
  if (!safe.isSafe) {
    const updateResponse = await Bot.findOneAndUpdate({ tradeWallet: wallet }, { $set: { isWorking: true } });
    const result = await mainWorking(bot.targetWallet, bot.tradeWallet, bot.secretKey, copyDetectResult, pasteDetectResult, safe);
    res.json({copyDetectResult, pasteDetectResult, safe});
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
// router.post('/botWorking', async (req, res) => {
//   // console.log('---------bot working-----');
//   const {tokenA, tokenB, amount} = req.body;
//   const { wallet } = req.body;
//   const {tradeWallet, targetWallet, secretKey } = await Bot.findOne({ tradeWallet: wallet });
  
//   await mainWorking(tradeWallet, targetWallet, secretKey);

//   console.log('tokenA', tokenA, 'tokenB', tokenB, 'amount', amount);
//   const response = await swapTokens(tokenA, tokenB, amount);
//   res.json({working: true});
// });
  
module.exports = router;
