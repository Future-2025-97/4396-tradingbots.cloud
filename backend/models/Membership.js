const mongoose = require('mongoose');

const MembershipSchema = new mongoose.Schema({
  typeOfMembership: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  maxCopyTokens: {
    type: Number,
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('memberships', MembershipSchema);
