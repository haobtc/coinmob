var argv = require('optimist').argv;
var server = require('./bin/walletserver.js');

var domain = require('domain').create();
domain.on('error', function(err) {
    console.error(err.stack);
});

domain.run(function() {
  server.start(argv);
});

