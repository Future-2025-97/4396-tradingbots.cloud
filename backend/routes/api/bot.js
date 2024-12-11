const express = require('express');
const router = express.Router();
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const Bot = require('../../models/Bot');
const { detectWallet, mainWorking, solPrice } = require('../../actions/main');
const { sendToken } = require('../../actions/tokens');
const raydiumSwap = require('../../actions/swapBaseIn');
const axios = require('axios');
const { closeBot, withdrawBot, getStatusBot } = require('../../actions/bot');

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
     console.log('req.body---', req.body);
     const user = await User.findOne({ userWallet: userWallet }).populate('membership');
     console.log('user---', user);
     if (!user) {
      return res.status(400).json({ msg: 'User not found' });
     }
     const botCount = await Bot.countDocuments({ userWallet: userWallet, isFinished: false });
     if (botCount > user.membership.maxBots) {
      return res.status(400).json({ msg: 'Max bots reached' });
     }
     console.log('tradeWallet---', tradeWallet);
     const tradeWallets = await Trade.findOne({ userWallet: userWallet, depositWallets: { $elemMatch: { isTrading: false } } });

     await Trade.updateOne({ 'depositWallets.wallet': tradeWallet.value }, { $set: { 'depositWallets.$.isTrading': true } });
     const matchingWallets = tradeWallets ? tradeWallets.depositWallets.filter(wallet => wallet.wallet === tradeWallet.value) : [];
     console.log('matchingWallets---', matchingWallets);
     if (!matchingWallets.length) {
      return res.status(400).json({ msg: 'Trade wallet not found' });
     }
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
     const savedBot = await bot.save();
     res.json({bot: savedBot, tradeWallets});
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
    const updatedBot = await Bot.findById(botId);
    console.log('updatedBot---', updatedBot);
    res.json({ bot: updatedBot, msg: 'Bot closed successfully' });
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
    await Bot.findByIdAndUpdate(botId, { $set: { isWithdraw: true } });
    res.json({ msg: response.signature, error: false });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/sendSignal', async (req, res) => {
  try{
    const { wallet } = req.body;
    console.log('wallet---', wallet);
    const bot = await Bot.findOne({ tradeWallet: wallet });
    const userInfo = await User.findOne({ userWallet: bot.userWallet }).populate('membership');

    const { copyDetectResult, pasteDetectResult, safe } = await detectWallet(wallet, bot.targetWallet, userInfo);
    
    // // Current status of trade wallet is reached to SL and and TP
    const isStopLossAndProfit = await getStatusBot(pasteDetectResult, bot);
    if(isStopLossAndProfit == false){
      if (!safe.isSafe) {
        await Bot.findOneAndUpdate({ tradeWallet: wallet }, { $set: { isWorking: true } });
        const result = await mainWorking(bot.targetWallet, bot.tradeWallet, bot.secretKey, copyDetectResult, pasteDetectResult, safe);
        console.log('result---', result);
        return res.json({result});
      }
    } else {
      console.log('bot close');
      await closeBot(bot.tradeWallet, bot.secretKey);
      await Trade.updateOne({ 'depositWallets.wallet': bot.tradeWallet.toString() }, { $set: { 'depositWallets.$.isTrading': false } });
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
