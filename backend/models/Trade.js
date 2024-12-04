const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    unique: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('trade', TradeSchema);
