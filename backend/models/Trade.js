const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  depositWallets: [{
    wallet: {
      type: String,
      required: true
    },
    isTrading: {
      type: Boolean,
      default: false
    },
    publicKey: {
      type: String,
      required: true
    },
    secretKey: {
      type: String,
      required: true
    }
  }],
  depositAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('trade', TradeSchema);
