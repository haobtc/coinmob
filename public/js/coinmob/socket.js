var  bitcore = require('bitcore');

var rpcSequence = 1000;
var rpcResultWaiter = {};

var socket = io('http://dev.openblock.com:9001');
socket.on('connect', function(conn) {
  console.info('connected', conn);
  var addressHashes = coinmob.walletman.addressHashes();
  socket.emit('watch', {
    addresses: addressHashes
  });
});

socket.on('rpc return', function(data) {
  var w = rpcResultWaiter[data.seq];
  console.info('rpc return', data, w);
  if(w) {
    w(data.result);
    delete rpcResultWaiter[data.seq];
  }
});

socket.on('error', function(err) {
  console.error(err.stack, err.data);
  socket.close();
});

coinmob.socket = socket;

function rpcCall(method, args, callback) {
  var seq = 'n' + rpcSequence++;
  coinmob.socket.emit('rpc call', {
    seq: seq,
    method: method,
    args: args});
  if(typeof callback == 'function')
    rpcResultWaiter[seq] = callback;
}


