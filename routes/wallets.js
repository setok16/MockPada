var express = require('express');
var router = express.Router();

var moment = require('moment');
var ObjectId = require('mongoose').Types.ObjectId;
var generateHash = require('random-hash').generateHash;
var request = require('request');
var os = require('os');
var bcrypt = require('bcrypt');

var User = require('../dbcon').User;
var Wallet = require('../dbcon').Wallet;
var handleError = require('../utils').handleError;

/* GET wallets listing. */
router.get('/', (req, res, next) => {
  if (req.query.page < 1 || req.query.per_page < 1 || req.query.per_page > 50) {
    res.status(400).send('Invalid per_page or page');
    return;
  }

  Wallet.find({}, (err, wallets) => {
    if (err) {
      handleError(next, err);
    } else {
      let response = {
        data: wallets,
        status: 'Success',
        meta: {
          pagination: {
            totalPages: req.query.page || 1,
            page: 1,
            perPage: req.query.per_page || 10,
            totalEntries: wallets.length || 0,
          },
        },
      };
      res.status(200).send(response);
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
      res.status(201).send(wallet);
    }
  });
});

router.put('/:wid/password', (req, res, next) => {
  if (!req.body.new) {
    res.status(400).send('Invalid body');
    return;
  }

  Wallet.findById(req.params.wid, (err, result) => {
    if (!result) {
      let err = new Error('walletId not found');
      err.status = 404;
      throw err;
    }
    return result;
  })
  .then( wallet => {
    res.status(200).send('adsf');
    //Wallet.findByIdAndUpdate(req.params.wid, (err, result) => { });
  })
  .catch( err => {
    res.status(err.status).send(err.message);
    return;
  });
});

router.post('/', (req, res, next) => {
/*
{
  "operation": "restore",
  "backupPhrase": [
  ],
  "assuranceLevel": "strict",
  "name": "My Wallet",
  "spendingPassword": null
}
*/

  if (!req.body.operation || !req.body.backupPhrase || !req.body.name) {
    var err = new Error('Invalid body');
    err.status = 400;
    next(err);
    return;
  }

  const wallet = new Wallet({
    'balance': 0,
    'createdAt': moment().format("YYYY-MM-DD'T'HH:mm:ss.SSSSSS"),
    'operation': req.body.operation,
    'backupPhrase': req.body.backupPhrase,
    'name': req.body.name,
    'hasSpendingPassword': req.body.spendingPassword ? true : false,
    'spendingPassword': req.body.spendingPassword || null,
  });

  // TODO: when operation === 'restore', do something

  wallet.save( (err, result) => {
    if (err) {
      res.status(500).send('Server error')
    } else {
      let response = {
        data: result,
        status: 'success',
        meta: {
          pagination: {
            totalPages: 0,
            page: 1,
            perPage: 10,
            totalEntries: 0,
          },
        },
      };
      response.data.backupPhrase = null;
      console.log(response);
      res.status(201).send(response);
    }
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
