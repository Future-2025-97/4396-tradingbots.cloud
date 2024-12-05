const mongoose = require('mongoose');

const IPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  registeredIPDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },  
});

module.exports = mongoose.model('ips', IPSchema);
