function BlockChain(netname) {
  this.latestBlock = null;
}

// Chain Manager
function ChainManager() {
  console.info('Chain Manage');
  var self = this;
  coinmob.config.supportedNetnames.forEach(function(netname) {
    self[netname] = new BlockChain(netname);
  });

  coinmob.socket.on('block', function(block) {
    if(self[block.network])
      self[block.network].latestBlock = block;
  });
}

coinmob.chainman = new ChainManager();
