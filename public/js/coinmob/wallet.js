var bitcore = require('bitcore');

function Wallet(netname) {
  var self = this;
  this.netname = netname;
  this.storage = new Storage(netname);
  this.transactions = [];
  this.unspent = new SkipList(SkipList.compareArray);
  this.addresses = [];
  this.encrypted = null;

  function decryptKeys(password) {
    if(!self.encrypted) {
      return [];
    }
    var keys = sjcl.decrypt(password, self.encrypted);
    keys = JSON.parse(keys);
    return keys;
  }

  function encryptKeys(password, keys) {
    self.encrypted = sjcl.encrypt(password, JSON.stringify(keys));
  }

  this.newAddress = function(password, seed) {
    seed = seed || ('' + Math.random());
    var privateKey = bitcore.util.sha256(seed);
    var key = new bitcore.Key();
    key.private = privateKey;
    key.regenerateSync();

    var hash = bitcore.util.sha256ripe160(key.public);
    var version = bitcore.networks[this.netname].addressVersion;
    var addr = new bitcore.Address(version, hash);

    this.addresses.push(addr);
    var keys = decryptKeys(password);
    keys.push({private: key.private.toString('hex'),
	       public: key.public.toString('hex'),
	       netname: netname,
	       address:addr.toString()});
    encryptKeys(password, keys);
    this._addrDict = undefined;
    this.storage.storeWallet(this.walletData());
    return addr;
  };
  this.loadWallet();
}

Wallet.prototype.loadWallet = function() {
  var self = this;
  this.storage.loadWallet(function(err, val) {
    if(err) throw err;
    self.encrypted = val.encrypted;
    self.addresses = val.addresses;
  });
};

Wallet.prototype.addressDict = function() {
  var self = this;
  if(this._addrDict) {
    return this._addrDict;
  }
  this._addrDict = {};
  this.addresses.forEach(function(addr) {
    self._addrDict[addr.toString()] = true;
  });
/*  if(this.netname == 'dogecoin') {
    this._addrDict['DJhFBMaUNBS5i5tbFyMFnXpwbaEM1RzUE4'] = true;
  } */
  return this._addrDict;
};

Wallet.prototype.balance = function() {
  var sum = new bitcore.Bignum(0);
  this.unspent.forEach(function(key, uspt) {
    sum = sum.plus(new bitcore.Bignum(uspt.amount));
  });
  return sum;
};

Wallet.prototype.addrBalances = function() {
  var bset = {};
  this.unspent.forEach(function(key, uspt) {
    var sum = bset[uspt.address];
    if(sum) {
      sum = sum.plus(new bitcore.Bignum(uspt.amount));
    } else {
      sum = new bitcore.Bignum(uspt.amount);
    }
    bset[uspt.address] = sum;
  });
  return bset;
};

Wallet.prototype.onTx = function(tx, updateUnspent) {
  var found = false;
  tx.hash = tx.txid;
  for(var i=0; i<this.transactions.length; i++) {
    if(tx.hash == this.transactions[i].hash) {
      found = true;
      this.transactions[i] = tx;
      break;
    }
  }
  if(!found) {
    this.transactions.push(tx);
    if(updateUnspent) {
      this.updateTx(tx);
    }
  }
};

Wallet.prototype.updateTx = function(tx) {
  var self = this;
  var addressDict = this.addressDict();
  if(!this.usptTimes) {
    this.usptTimes = 0;
  }
  tx.inputs.forEach(function(input) {
    if(!input.address) return;
    if(addressDict[input.address]) {
      var key = [input.hash, input.vout];
      self.unspent.remove(key);
    }
  });
  tx.outputs.forEach(function(output, vout) {
    if(!output.address) return;
    if(addressDict[output.address]) {
      var uspt = {
	network: self.netname,
	txid: tx.txid,
	vout: vout,
	amount: output.amount,
	conrirmations: tx.confirmations,
	scriptPubKey: output.script,
	time: tx.time
      };
      self.addUnspent(uspt);
    }
  });
};

Wallet.prototype.addUnspent = function(uspt) {
  this.unspent.set([uspt.txid, uspt.vout], uspt);
};

Wallet.prototype.walletData = function() {
  return {encrypted: this.encrypted,
	  addresses: this.addresses};
};

/**
  * WalletManager
  */
function WalletManager() {
  var self = this;
  coinmob.config.supportedNetnames.forEach(function(netname) {
    self[netname] = new Wallet(netname);
  });

  coinmob.socket.on('snapshot txes', function(txes) {
    try {
      for(var netname in txes) {
	txes[netname].forEach(function(tx) {
	  self[netname].onTx(tx, false);
	});
      }
    } catch(e) {
      console.error('xxxx', e.message, e.stack);
      throw e;
    }
  });

  coinmob.socket.on('unspent', function(arr) {
    try {
      self.eachWallet(function(wallet) {
	wallet.unspent.clear();
      });
      arr.forEach(function(uspt) {
	self[uspt.network].addUnspent(uspt);
      });
    } catch(e) {
      console.error(e.message, e.stack);
      throw e;
    }
  });

  coinmob.socket.on('tx', function(tx) {
    try {
      self[tx.network].onTx(tx, true);
    } catch(e) {
      console.error('yyyy', e);
      throw e;
    }
  });

  coinmob.socket.on('archived tx', function(tx) {
    self[tx.network].onArchiveTx(tx);
  });
}

WalletManager.prototype.addresses = function() {
  var self =this;
  return coinmob.config.supportedNetnames.reduce(function(addresses, netname) {
    return addresses.concat(self[netname].addresses);
  }, []);
};

WalletManager.prototype.addressHashes = function() {
  var arr = this.addresses().map(function(a) {return a.toString();});
//  arr.push('DJhFBMaUNBS5i5tbFyMFnXpwbaEM1RzUE4');
  return arr;
};

WalletManager.prototype.eachWallet = function(cb) {
  var self = this;
  coinmob.config.supportedNetnames.forEach(function(netname) {
    cb(self[netname]);
  });
};

coinmob.walletman = new WalletManager();


