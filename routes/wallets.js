var express = require('express');
var router = express.Router();

var moment = require('moment');
var ObjectId = require('mongoose').Types.ObjectId;
var generateHash = require('random-hash').generateHash;
var request = require('request');
var os = require('os');

var User = require('../dbcon').User;
var Wallet = require('../dbcon').Wallet;
var handleError = require('../utils').handleError;

/* GET wallets listing. */
router.get('/', (req, res, next) => {
  Wallet.find({}, (err, wallets) => {
    if (err) {
      handleError(next, err);
    } else {
      res.status(200).send(wallets);
    }
  });
});

router.get('/:wid', (req, res, next) => {
  Wallet.findOne({_id: req.params.wid}, (err, wallet) => {
    if (!ObjectId.isValid(req.params.wid)) {
      var err = new Error('Invalid wid format');
      handleError(next, err, 400);
    } else if (err) {
      handleError(next, err);
    } else if (!wallet) {
      var err = new Error('Wallet not found');
      handleError(next, err, 404);
    } else {
      res.status(200).send(wallet);
    }
  });
});

router.post('/', (req, res, next) => {
/*
  {
    owner: String,
  }
*/
  if (!req.body.owner) {
    var err = new Error('Owner uid required');
    err.status(400);
    next(err);
    return;
  }

  // Promise.resolve(User.findOne({_id: req.body.owner}))
  User.findOne({_id: req.body.owner})
    .then( owner => {
      if (!ObjectId.isValid(req.body.owner)) {
        var err = new Error('Invalid owner format');
        err.status = 400;
        throw err;
      } else if (!owner) {
        var err = new Error('User not found');
        err.status = 400;
        throw err;
      } else {
        console.log(owner);
        return new Wallet({
          owner: req.body.owner,
          address: generateHash({ length: 34 }),
          balance: 0,
          creationDate: moment().format('YYYY-MM-DD'),
        });
      }
    })
    .then( wallet => {
        wallet.save((err, result) => {
          if (err) {
            throw err;
          } else {
            res.status(200).send(result);
          }
        });
    })
    .catch(err => {
      next(err);
    });
});

router.patch('/generateNewAddress/:wid', (req, res, next) => {
  if (!req.params.wid) {
    var err = new Error('wid required as url param');
    err.status(400);
    next(err);
    return;
  }
  Wallet.findByIdAndUpdate(req.params.wid, { address: generateHash({ length: 34 }) })
    .then( result => {
      return Wallet.findById(req.params.wid);
    })
    .then( result => {
      res.status(200).send('New Address: ' + result.address);
    })
    .catch( err => {
      handleError(next, err);
      return;
    });
});

router.patch('/send/:wid', (req, res, next) => {
/*
  {
    address: String,
    amount: Number,
  }
*/
  if (!req.params.wid) {
    var err = new Error('wid required');
    err.status = 400;
    handleError(next, err);
    return;
  } else if (!req.body.address, !req.body.amount) {
    var err = new Error('address and amount required in request body');
    err.status = 400;
    handleError(next, err);
    return;
  }

  let transRequestBody = {
      amount: req.body.amount,
      senderId: req.params.wid,
      receiverAddress: req.body.address,
    };

  Wallet.findById(req.params.wid)
    .then( result => {
      if (result.balance < req.body.amount) {
        let err = new Error('Insufficient balance');
        err.status = 400;
        throw err;
      }
      transRequestBody.senderAddress = result.address;
      return Wallet.findByIdAndUpdate(req.params.wid, { $inc: { balance: -(req.body.amount) } })
    })
    .then( result => { // There is no error checking here...
      return Wallet.findOneAndUpdate({ address: req.body.address }, { $inc: { balance: req.body.amount } });
    })
    .then( result => {
      transRequestBody.receiverId = result._id.toString();
      console.log(transRequestBody);
      return request.post(req.protocol+'://'+req.get('host')+'/transactions', {form: transRequestBody}); 
    })
    .then( result => {
      res.status(200).send(req.body.amount + ' ADA successfully sent');
    })
    .catch( err => {
      next(err);
    });
});

module.exports = router;
