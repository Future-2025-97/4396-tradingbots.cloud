const Trade = require('../models/Trade');
const User = require('../models/User');
const Bot = require('../models/Bot');
const { detectWallet, mainWorking } = require('./main');
const { closeBot, getStatusBot } = require('./bot');

const checkAllBots = async () => {
    try {
      const bots = await Bot.find({ isFinished: false }); // Fetch all active bots
      for (const bot of bots) {
        const userInfo = await User.findOne({ userWallet: bot.userWallet }).populate('membership');
        console.log('userInfo---', userInfo);
        const { copyDetectResult, pasteDetectResult, safe } = await detectWallet(bot.tradeWallet, bot.targetWallet, userInfo);
        const isStopLossAndProfit = await getStatusBot(pasteDetectResult, bot);
        console.log('isStopLossAndProfit---', isStopLossAndProfit);
        if (isStopLossAndProfit == false) {
          if (!safe.isSafe) {
            await Bot.findOneAndUpdate({ tradeWallet: bot.tradeWallet }, { $set: { isWorking: true } });
            const result = await mainWorking(bot.targetWallet, bot.tradeWallet, bot.secretKey, copyDetectResult, pasteDetectResult, safe);
            return result;
          }
        } else {
          console.log('bot close');
          await closeBot(bot.tradeWallet, bot.secretKey);
          await Trade.updateOne({ 'depositWallets.wallet': bot.tradeWallet.toString() },  { $set: { 'depositWallets.$.isTrading': false } } );
          await Bot.findByIdAndUpdate(bot._id, { $set: { isFinished: true } });
          return `Bot ${bot.tradeWallet} closed successfully`;
        }
      }
    } finally {
        const endTime = Date.now(); // End time
        const duration = (endTime - startTime) / 1000; // Duration in seconds
        console.log(`Processed ${bots.length} bots in ${duration} seconds`);
        return 'checkAllBots finished';
    }
};

module.exports = { checkAllBots };
  
