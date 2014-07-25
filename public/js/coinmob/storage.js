var bitcore = require('bitcore');

function Storage(netname) {
  this.netname = netname;
}

Storage.prototype.key = function(k) {
  return this.netname + ':' + k;
};

Storage.prototype.getValue = function(key, callback) {
  var val = localStorage.getItem(this.key(key));
  if(val) {
    callback(undefined, JSON.parse(val));
  } else {
    callback();
  }
};

Storage.prototype.setValue = function(key, value, callback) {
  localStorage.setItem(this.key(key), JSON.stringify(value));
  if(typeof callback == 'function') callback(undefined, value);
};

Storage.prototype.loadWallet = function(callback) {
  this.getValue('wallet', function(err, val) {
    if(err) return callback(err);
    val = val || {addresses: []};
    val.addresses = val.addresses.map(function(addrString){ return new bitcore.Address(addrString);});
    callback(undefined, val);
  });
};

Storage.prototype.storeWallet = function(val, callback) {
  var v = {encrypted: val.encrypted};
  v.addresses = val.addresses.map(function(addr) {return addr.toString();});
  this.setValue('wallet', v, callback);
};

Storage.prototype.loadUnspent = function(callback) {
  this.getValue('unspent', callback);
};

Storage.prototype.storeUnspent = function(unspent, callback) {
  this.setValue('unspent', unspent, callback);
};

Storage.prototype.getTx = function(txhash, callback) {
  this.getValue('tx/' + txhash, callback);
};

Storage.prototype.setTx = function(tx, callback) {
  this.setValue('tx/' + txhash, tx, callback);
};
