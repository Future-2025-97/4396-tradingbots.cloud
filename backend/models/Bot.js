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
  createdTime: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  targetTx: [{
    signature: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    tokenAddressA: {
      type: String,
      required: true
    },
    tokenAddressB: {
      type: String,
      required: true
    },
    tokenAmountA: {
      type: Number,
      required: true
    },
    tokenAmountB: {
      type: Number,
      required: true
    },
    tokenDecimalsA: {
      type: Number,
      required: true
    },
    tokenDecimalsB: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('bots', BotSchema);
