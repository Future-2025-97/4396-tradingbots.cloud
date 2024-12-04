const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
var bodyParser = require('body-parser');
var app = require('express')();
var http = require('http').Server(app);
require('dotenv').config();
const cors = require('cors');
const mongoURI = process.env.MONGO_URI;
const portNumber = process.env.PORT_NUMBER || 5000;
const detectWallet = require('./actions/main');

app.use(cors({
    origin: '*'
}));

// Connect Database
connectDB(mongoURI);

// Init Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Define Routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/trade', require('./routes/api/trade'));
app.use('/api/bot', require('./routes/api/bot'));
app.use('/api/membership', require('./routes/api/membership'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

http.listen(portNumber, function(){
  console.log(`server is listening on *:${portNumber}`);
});
