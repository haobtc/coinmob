
function main() {
  var bitcore = require('bitcore');
  var a = new bitcore.Address('LRBtzAb2bccBKRZa445ynXcoMAt48LhB8m');
  console.info('a', a.isValid());
}
