var express = require('express');
var async = require('async');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send({error: true});
});

app.use('/bower_components/', express.static('bower_components'));
app.use('/public/', express.static('public'));
app.get('/haha', function(req, res) {
  console.info('haha');
  res.send('ok');
});

module.exports.start = function(argv){
  console.info('wallet server starts at', argv.p || 6000);
  app.listen(argv.p || 6000);
}
