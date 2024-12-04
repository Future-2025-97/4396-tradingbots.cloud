const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userWallet: {
    type: String,
    required: true,
    unique: true
  },
  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'memberships'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('users', UserSchema);
