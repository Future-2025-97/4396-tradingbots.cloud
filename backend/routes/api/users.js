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

module.exports = router;
