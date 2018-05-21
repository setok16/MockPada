require('dotenv').config();
let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);

var userSchema = mongoose.Schema({
  uname: String,
  creationDate: String
});
var User = mongoose.model('User', userSchema);

var walletSchema = mongoose.Schema({
  address: String,
  owner: String,
  balance: Number,
  creationDate: String
});
var Wallet =  mongoose.model('Wallet', walletSchema);

var transactionSchema = mongoose.Schema({
  amount: Number,
  time: String,
  senderId: String,
  receiverId: String,
  senderAddress: String,
  receiverAddress: String,
  rates: Object,
});
var Transaction = mongoose.model('Transaction', transactionSchema);

module.exports.User = User;
module.exports.Wallet = Wallet;
module.exports.Transaction = Transaction;
