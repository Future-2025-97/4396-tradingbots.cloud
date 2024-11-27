const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  transactions: [{
    signature: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal'],
      default: 'deposit'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('users', UserSchema);
