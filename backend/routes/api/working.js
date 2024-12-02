const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const Bot = require('../../models/Bot');
const { createPhantomAccount } = require('../../actions/account');
const { detectWallet } = require('../../actions/main');
const { swapBase } = require('../../actions');
router.get('/botWorking', async (req, res) => {
  // console.log('---------bot working-----');
  // const {tokenA, tokenB, amount} = req.body;
  // const { wallet } = req.body;
  // const {tradeWallet, targetWallet, secretKey } = await Bot.findOne({ tradeWallet: wallet });
  
  // const response = await detectWallet(tradeWallet, targetWallet, secretKey);

  // console.log('tokenA', tokenA, 'tokenB', tokenB, 'amount', amount);
  // const response = await swapTokens(tokenA, tokenB, amount);
  const response = await swapBase();
  res.json({msg: response});
});
  
module.exports = router;
