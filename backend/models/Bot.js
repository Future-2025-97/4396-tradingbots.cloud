const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true
  },
  tradeWallet: {
    type: String,
    required: true
  },
  targetWallet: {
    type: String,
    required: true
  },
  stopLoss: {
    type: Number,
    required: true
  },
  takeProfit: {
    type: Number,
    required: true
  },
  isTakeProfit: {
    type: Boolean,
    required: true
  },
  isStopLoss: {
    type: Boolean,
    required: true
  },
  secretKey: {
    type: String,
    required: true
  },
  depositValue: {
    type: Number,
    required: true
  },
  depositPrice: {
    type: Number,
    required: true
  },
  createdTime: {
    type: Number,
    required: true
  },
  isFinished: {
    type: Boolean,
    required: true,
    default: false
  },
  isWithdraw: {
    type: Boolean,
    required: true,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isWorking: {
    type: Boolean,
    required: true,
    default: false
  },
});

module.exports = mongoose.model('bots', BotSchema);
