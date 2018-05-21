var express = require('express');
var router = express.Router();

var moment = require('moment');
var ObjectId = require('mongoose').Types.ObjectId;

var User = require('../dbcon').User;
var handleError = require('../utils').handleError;

/* GET users listing. */
router.get('/', (req, res, next) => {
  User.find({}, (err, users) => {
    if (err) {
      handleError(next, err);
      return;
    }
    res.status(200).send(users);
  });
});

router.get('/:uid', (req, res, next) => {
  User.findOne({_id: req.params.uid}, (err, user) => {
    if (!ObjectId.isValid(req.params.uid)) {
      var err = new Error('Invalid uid format');
      handleError(next, err, 400);
    } else if (err) {
      handleError(next, err, 500);
    } else if (!user) {
      var err = new Error('User not found');
      handleError(next, err, 404);
    } else {
      res.status(200).send(user);
    }
  });
});

router.post('/', (req, res, next) => {
  if (!req.body.uname) {
    var err = new Error('uname required');
    handleError(next, err, 400);
  } else {
    var user = new User({
      uname: req.body.uname,
      creationDate: moment().format('YYYY-MM-DD'),
    });
    user.save((err, result) => {
      if (err) {
        handleError(next, err);
      } else {
        res.status(200).send(result);
      }
    });
  }
});

module.exports = router;
