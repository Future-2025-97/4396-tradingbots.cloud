const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const Trade = require('../../models/Trade');
const User = require('../../models/User');
const verifyTransactionSignature = require('../../actions/transaction');
const { createPhantomAccount } = require('../../actions/account');

router.post('/getDepositWallets', async (req, res) => {
  try {
    const { wallet } = req.body;
    const isExist = await Trade.findOne({ userWallet: wallet });
    if (!isExist) {
      return res.status(400).json({ msg: 'Trade not found' });
    }
    const { depositWallets } = await Trade.findOne({ userWallet: wallet });
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
    const newWallet = await createPhantomAccount();
    const isExist = await Trade.findOne({ userWallet: wallet });
    if (isExist) {
      const updateTrade = await Trade.findByIdAndUpdate(isExist._id, {
        $push: { depositWallets: {
          wallet: newWallet.publicKey.toString(),
          publicKey: newWallet.publicKey.toString(),
          secretKey: newWallet.secretKey.toString()
        } }
      });
      return res.json(updateTrade);
    }
    const newTrade = await Trade.create({
      userWallet: wallet,
      depositWallets: [{
        wallet: newWallet.publicKey.toString(),
        publicKey: newWallet.publicKey.toString(),
        secretKey: newWallet.secretKey.toString()
      }]
    });
    res.json(newTrade);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// router.post('/confirmTransaction', async (req, res) => {
//   const authHeader = req.header('Authorization');
//   try {
//     const { signature, amount } = req.body;
    
//     // Verify auth token
//     if (!authHeader?.startsWith('Bearer ')) {
//       return res.status(401).json({ msg: 'Invalid token format' });
//     }
    
//     // Get user from token
//     const token = authHeader.split(' ')[1];
//     const decoded = jwt.verify(token, config.jwtSecret);

//     // Verify transaction signature with Solana web3
//     const isValidTransaction = await verifyTransactionSignature(signature);
    
//     if (!isValidTransaction) {
//       return res.status(400).json({ msg: 'Invalid transaction' });
//     }
    
//     // Update user's balance/data and deposit amount
//     const updatedUser = await User.findByIdAndUpdate(
//       decoded.user.id,
//       { 
//         $inc: { 
//           balance: amount,
//           depositAmount: amount  // Add deposit amount update
//         },
//         $push: { transactions: { signature, amount, timestamp: Date.now() } }
//       },
//       { new: true }
//     );  
//     res.json(updatedUser);        
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

module.exports = router;
