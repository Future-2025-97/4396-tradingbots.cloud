const express = require('express');
const router = express.Router();
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const Bot = require('../../models/Bot');
const Membership = require('../../models/Membership');
const { detectWallet, mainWorking, solPrice } = require('../../actions/main');
const { sendToken } = require('../../actions/tokens');
const raydiumSwap = require('../../actions/swapBaseIn');
const axios = require('axios');
const { closeBot, withdrawBot, getStatusBot } = require('../../actions/bot');
const { getCoin } = require('../../actions/coin');

router.get('/getCoin', async (req, res) => {
  try {
    const response = await getCoin();
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

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

     const user = await User.findOne({ userWallet: userWallet }).populate('membership');
     if (!user) {
      return res.status(400).json({ msg: 'User not found' });
     }
     const botCount = await Bot.countDocuments({ userWallet: userWallet });
     if (botCount > user.membership.maxBots) {
      return res.status(400).json({ msg: 'Max bots reached' });
     }

     const trade = await Trade.findOne({ 'depositWallets.wallet': tradeWallet.value }, { depositWallets: 1 });

     await Trade.updateOne({ 'depositWallets.wallet': tradeWallet.value }, { $set: { 'depositWallets.$.isTrading': true } });

     const matchingWallets = trade ? trade.depositWallets.filter(wallet => wallet.wallet === tradeWallet.value) : [];

     if (!matchingWallets.length) {
      return res.status(400).json({ msg: 'Trade wallet not found' });
     }
     console.log('depositValue---', depositValue);
     const {price, nativePrice} = await solPrice(depositValue);
     const secretKey = matchingWallets[0].secretKey;

    //  console.log('depositPrice---', depositPrice);
     console.log(stopLoss, isStopLoss);

     const bot = new Bot({
      userWallet: userWallet,
      tradeWallet: tradeWallet.value,
      targetWallet: targetWallet,
      depositValue: depositValue,
      depositPrice: price,
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
    const bots = await Bot.find({ userWallet: wallet, isWithdraw: false }, { secretKey: 0 });
    res.json(bots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.post('/sendToken', async (req, res) => {
  try{
    const { amount, token, recipient } = req.body;
    const response = await sendToken(amount, token, recipient);
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/getTransactions', async (req, res) => {
  try {
    const { botId } = req.body;
    const bot = await Bot.findById(botId).sort({ createdAt: -1 });
    const txs = bot.targetTx.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(txs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/closeBot', async (req, res) => {
  try {
    const { botId } = req.body;

    const bot = await Bot.findById(botId);
    await closeBot(bot.tradeWallet, bot.secretKey);
    console.log('bot.tradeWallet---', bot.tradeWallet);
    const response = await Trade.updateOne({ 'depositWallets.wallet': bot.tradeWallet.toString() }, { $set: { 'depositWallets.$.isTrading': false } });

    console.log('res---', response);
    await Bot.findByIdAndUpdate(botId, { $set: { isFinished: true } });
    res.json({ msg: 'Bot closed successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/withdrawBot', async (req, res) => {
  try {
    const { botId, withdrawAddress } = req.body;
    console.log('withdrawWallet---', withdrawAddress);
    console.log('botId---', botId);
    const bot = await Bot.findById(botId);
    const response = await withdrawBot(bot.tradeWallet, bot.secretKey, withdrawAddress);
    if (response.error) {
      return res.status(400).json({ msg: response.error });
    }
    console.log('response---', response);
    await Bot.findByIdAndUpdate(botId, { $set: { isWithdraw: true } });
    res.json({ msg: response.signature });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/sendSignal', async (req, res) => {
  try{
    console.log('sendSignal');
    const { wallet } = req.body;
    const bot = await Bot.findOne({ tradeWallet: wallet });
    console.log('bot---', bot);
    const userInfo = await User.findOne({ userWallet: bot.userWallet }).populate('membership');

    const { copyDetectResult, pasteDetectResult, safe } = await detectWallet(wallet, bot.targetWallet, bot.secretKey, userInfo);
    const isStopLossAndProfit = await getStatusBot(pasteDetectResult, bot);

    if(isStopLossAndProfit == false){
      if (!safe.isSafe) {
        const updateResponse = await Bot.findOneAndUpdate({ tradeWallet: wallet }, { $set: { isWorking: true } });
        const result = await mainWorking(bot.targetWallet, bot.tradeWallet, bot.secretKey, copyDetectResult, pasteDetectResult, safe);
        return res.json({result});
      }
    } else {
      await closeBot(bot.tradeWallet, bot.secretKey);
      await Trade.updateOne({ 'depositWallets.wallet': bot.tradeWallet.toString() }, { $set: { 'isTrading': false } });
      await Bot.findByIdAndUpdate(bot._id, { $set: { isFinished: true } });
      return res.json({ msg: 'Bot closed successfully' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/isSwapAvailable', async (req, res) => {
  try{
    const { tokenAddress } = req.body;
    if (tokenAddress != undefined) {
      const tokenInfo = await axios.get(`${process.env.DEXSCREENER_API_URL}${tokenAddress}`);
      for (const pair of tokenInfo.data.pairs) {
        const response = await raydiumSwap.loadPoolKeys(pair.pairAddress);
        if (response) {
          res.json({ msg: true });
          return; // End the function after sending the response
        }
      }
      res.json({ msg: false });
    } else {    
      res.json({ msg: false });
    }
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
  
module.exports = router;
