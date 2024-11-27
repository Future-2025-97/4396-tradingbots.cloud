const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../../models/User');
const verifyTransactionSignature = require('../../actions/transaction');

router.post('/connectWallet', async (req, res) => {  
    const { userWallet } = req.body;
    try {
      let user = await User.findOne( { 'userWallet': userWallet } );
      const payload = {
        user: {
          id: user ? user.id : null
        }
      };
      if (user) {        
        const token = jwt.sign(
          payload,
          config.jwtSecret,
          { expiresIn: '5 days' }
        );
        return res.json({ user: user, token: token });
      }

      user = new User({
        userWallet
      });

      await user.save();       

      const token = jwt.sign(
        payload,
        config.jwtSecret,
        { expiresIn: '5 days' }
      );
      return res.json({ user: user, token: token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }  
});

// router.get('/getAllUsers', async (req, res) => {
//   try {
//     const user = await User.find();
//     res.json(user);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server Error');
//   }
// });

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
