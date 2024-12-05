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
  registeredUserDate: {
    type: Date,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },  
  ipAddress: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model('users', UserSchema);
