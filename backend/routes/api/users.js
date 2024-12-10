const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../../models/User');
const Trade = require('../../models/Trade');
const requestIp = require('request-ip');
const Membership = require('../../models/Membership');
const IPInfo = require('../../models/IPInfo');

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

      const membership = await Membership.findOne({ typeOfMembership: 0 });
      let registeredUserDate = null;
      const isExistIP = await IPInfo.findOne({ ipAddress: requestIp.getClientIp(req) });

      if(!isExistIP){
        console.log('new IP');
        registeredUserDate = new Date();
        await IPInfo.create({ ipAddress: requestIp.getClientIp(req), registeredIPDate: registeredUserDate });
      } else {
        console.log('exist IP');
        registeredUserDate = isExistIP.registeredIPDate;
      }

      user = new User({
        userWallet,
        ipAddress: requestIp.getClientIp(req),
        membership: membership._id,
        registeredUserDate: registeredUserDate
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

router.post('/getUserInfo', async (req, res) => {
  const { wallet } = req.body;
  console.log('wallet---', wallet);
  try {
    const user = await User.findOne({ userWallet: wallet }).populate('membership');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    console.log('user before population---', user);
    console.log('populated user---', user.membership); // Log the populated membership
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/getUserWalletCount', async (req, res) => {
  const { wallet } = req.body;
  const user = await User.findOne({ userWallet: wallet }).populate('membership');
  const botCount = await Trade.countDocuments({ userWallet: wallet, 'depositWallets.isTrading': true });
  console.log('botCount---', botCount);
  console.log('user---', user.membership.maxBots);
  const tradeCount = user.membership.maxBots - botCount;
  res.json({userInfo: user, count: tradeCount });
});

router.get('/deleteUsersInfo', async (req, res) => {
  // const { wallet } = req.body;
  await User.deleteMany({});
  res.json({ msg: 'Users deleted successfully' });
});
module.exports = router;
