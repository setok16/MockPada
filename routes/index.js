var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  // let paths = ['GET /user', 'GET /user/:uid', 'POST /user'];
  const paths = {
    '/users': {
      'GET': [
        '/users',
        '/users/:uid',
      ],
      'POST': [
        '/users',
      ],
    },
    '/wallets': {
      'GET': [
        '/wallets/',
        '/wallets/wid',
      ],
      'POST': [
        '/wallets',
      ],
    },
  };

  res.status(200).send(paths);
});

module.exports = router;
