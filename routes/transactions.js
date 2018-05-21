var express = require('express');
var router = express.Router();

var moment = require('moment');
var request = require('request');

var Transaction = require('../dbcon').Transaction;
var handleError = require('../utils').handleError;

router.get('/', (req, res, next) => {
  Transaction.find({}, (err, transactions) => {
    if (err) {
      handleError(next, err);
    } else {
      res.status(200).send(transactions);
    }
  });
});

router.get('/:wid', (req, res, next) => {
  let wid = req.params.wid;
  Transaction.find({$or: [ {'senderId': wid}, {'receiverId': wid}] }, (err, result) => {
    let history = [];
    for (let i = 0; i < result.length; i++) {
      if (result[i].senderId === wid) {
        history.push({
          type: 'sent',
          amount: result[i].amount,
          address: result[i].receiverAddress,
          rates: JSON.parse(result[i].rates)
        });
      } else {
        history.push({
          type: 'received',
          amount: result[i].amount,
          address: result[i].senderAddress,
          rates: JSON.parse(result[i].rates)
         });
      }
    }
    res.status(200).send(history);
  });
});

router.post('/', (req, res, next) => {
  /*
    {
      amount: Number,
      senderId: String,
      receiverId: String,
      senderAddress: String,
      receiverAddress: String,
    }
  */
  if (!req.body.amount || !req.body.senderId|| !req.body.receiverId || !req.body.senderAddress || !req.body.receiverAddress) {
    let err = new Error('amount, sender, and receiverfields are required');
    err.status = 400;
    handleError(next, err);
    return;
  }

  let getOptions = {
    url: 'https://min-api.cryptocompare.com/data/price?fsym=ADA&tsyms=BTC,USD,JPY',
    method: 'GET',
  };


  request(getOptions, (error, response, body) => {
    if (response.statusCode == 200) {
      
      let transaction = new Transaction({
        amount: req.body.amount,
        senderId: req.body.senderId,
        receiverId: req.body.receiverId,
        senderAddress: req.body.senderAddress,
        receiverAddress: req.body.receiverAddress,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
        rates: body,
      });

      transaction.save((err, result) => {
        if (err) {
          handleError(next, err);
          return;
        } else {
          res.status(200).send(result);
        }
      });

    } else {
      let err = new Error('Could not get current rate');
      err.status = 500;
      handleError(next, err);
      return;
    }
  });
  
  
});

module.exports = router;
