function SkipList(opts) {
  opts = opts||{};
  if(typeof opts == 'function') opts = {compareFunc:opts};
  this.compare = opts.compareFunc||function(k1, k2) {return k1>k2?1:(k1==k2?0:-1)};
  this.genRate = opts.genRate||0.25;
  this.root = {key: null, value: null, skips:[]};

  this.len  = 0;
  this.compareNode = function(n1, n2) {
    if(n1 == this.root && n2 == this.root) {
      return 0;
    } else if (n1 == this.root) {
      return -1;
    } else if (n2 == this.root) {
      return 1;
    } else {
      return this.compare(n1.key, n2.key);
    }
  };

  this.valid = function(node) {
    return !!node && node != this.root;
  }

  this.prevNode = function(start, level, key) {
    if(this.compareNode(start, {key:key}) > 0)  return null;

    while(this.valid(start.skips[level].next)) {
      if(this.compareNode(start.skips[level].next, {key:key}) > 0) {
	return start;
      }
      start = start.skips[level].next;
    }
    return start;
  };

  this.prevNodes = function(key) {
    var nodes = [];
    var start = null;
    
    for(var level=this.root.skips.length-1; level>=0;level--) {
      if(!start) start = this.root;
      var start = this.prevNode(start, level, key);
      if(start) {
	nodes.push(start);
      }
    }
    nodes = nodes.reverse();
    return nodes;
  };
  
  this.updateCount = function(node, level) {
    if(level == 0) {
      node.skips[0].cnt = 1;
    } else {
      var sumCnt = 0;
      var next = node.skips[level].next;
      var p = node;
      while(true) {
	if(this.valid(next) && this.compareNode(p, next) >= 0) break;
	sumCnt += p.skips[level-1].cnt;
	p = p.skips[level-1].next;
	if(!this.valid(p)) break;
      }
      node.skips[level].cnt = sumCnt;
    }
  };

  this.getNode = function(key) {
    var bounds = this.prevNodes(key);
    if(bounds.length > 0 && this.compareNode(bounds[0], {key:key}) == 0) {
      return bounds[0];
    }
  };

  this.skip = function(node, n, level) {
    if(level == undefined) level = this.root.skips.length - 1;
    var sumn = 0;
    while(true) {
      if(sumn + node.skips[level].cnt < n ||
	 (level == 0 && sumn + 1 == n)) {
	sumn += node.skips[level].cnt;
	node = node.skips[level].next;
	if(!this.valid(node)) {
	  break;
	}
      } else if(level == 0) {
	return node;
      } else {
	level--;
      }
    }
  };
};

SkipList.prototype.size = function() {
  if(this.root.skips.length > 0) {
    var highLevel = this.root.skips.length - 1;
    var p = this.root;
    var sumCnt = 0;
    do {
      sumCnt += p.skips[highLevel].cnt;
      p = p.skips[highLevel].next;
    } while(this.valid(p));
    return sumCnt - 1;
  } else {
    return 0;
  }
};


SkipList.prototype.getAt = function(index) {
  if(index < 0) return;
  var level = this.root.skips.length - 1;
  if(level < 0) return;
  for(; level>=0 && this.root.skips[level].cnt > index;level--) {}
  var sumCnt = this.root.skips[level].cnt;
  var p = this.skip(this.root.skips[level].next,
		    index - this.root.skips[level].cnt,
		    level);
  if(p) return p.item();
};

SkipList.prototype.get = function(key) {
  var node = this.getNode(key);
  if(node) return node.value;
};

SkipList.prototype.set = function(key, val) {
  var bounds = this.prevNodes(key);
  
  if(bounds.length > 0 && this.compareNode(bounds[0], {key:key}) == 0) {
    bounds[0].value = val;
  } else {
    var node = {key: key,
		value: val,
		skips:[],
		item: function() {
		  return {key: this.key, value: this.value};
		}};
    var r = 1.0, level=0;
    while(r > Math.random()) {
      // Insert a skip at a level
      var bound = bounds[level];
      var skip = {cnt:1};
      if(bound) {
	skip.next = bound.skips[level].next,
	skip.prev = bound;
	if(skip.next) {
	  skip.next.skips[level].prev = node;
	}
	bound.skips[level].next = node;
      } else {
	var rootSkip = {cnt: 1, next: node, prev: node};
	this.root.skips.push(rootSkip);
	skip.next = this.root;
	skip.prev = this.root;
	bounds.push(this.root);
      }      
      node.skips.push(skip);
      r *= this.genRate;
      level++;
    }

    for(var level=0;level<node.skips.length; level++) {
      this.updateCount(node, level);
    }
    for(var level=0;level<bounds.length; level++) {
      this.updateCount(bounds[level], level);
    }
  }
};

/**
 * Remove an element by key
 */
SkipList.prototype.remove = function(key) {
  var bounds = this.prevNodes(key);
  if(bounds.length > 0 && this.compareNode(bounds[0], {key: key}) == 0) {
    var node = bounds[0];
    for(var level=0; level<node.skips.length; level++) {
      if(this.compareNode(bounds[level], {key:key}) == 0) {
	bounds[level] = node.skips[level].prev;
      }
      var next = node.skips[level].next;
      var prev = node.skips[level].prev;
      next.skips[level].prev = prev;
      prev.skips[level].next = next;
    }

    for(var level = this.root.skips.length - 1;level>=0;level--) {
      if(!this.valid(this.root.skips[level].next)) {
	this.root.skips.pop();
	bounds.pop();
      }
    }
    for(var level=0;level<bounds.length; level++) {
      if(bounds[level]) {
	this.updateCount(bounds[level], level);
      }
    }
    return true;
  } else {
    return false;
  }
};

/**
 * Return a iterator of elems where startKey <= elem.key <= endKey
 * 
 */ 
SkipList.prototype.range = function(startKey, endKey, callback) {
  var node;
  if(this.compareNode({key:startKey}, {key:endKey}) <= 0) {
    var bounds = this.prevNodes(startKey);
    if(bounds.length > 0) {
      node = this.compareNode(bounds[0], {key:startKey})==0?bounds[0]:bounds[0].skips[0].next;
    } else {
      node = this.root.skips[0].next;
    }
    var i = 0;
    for(;node && this.compareNode(node, {key:endKey}) <= 0; node=node.skips[0].next) {
      if(false === callback(node.key, node.value, i++)) break;
    }
  } else {
    var bounds = this.prevNodes(startKey);
    if(bounds.length > 0) {
      node = bounds[0];
    } else {
      return;
    }
    var i = 0;
    for(;node && this.compareNode(node, {key:endKey}) >= 0; node=node.skips[0].prev) {
      if(false === callback(node.key, node.value, i++)) break;
    }    
  }
};

SkipList.prototype.tail = function() {
  var prev = this.root.skips[0].prev;
  if(prev) {
    return prev.item();
  }
  return null;
};

SkipList.prototype.head = function() {
  return this.root.skips[0].next.item();
};

SkipList.prototype.forEach = function(callback) {
  var p = this.root.skips[0].next;
  var i = 0;
  while(this.valid(p)) {
    callback(p.key, p.value, i++, p.skips);
    p = p.skips[0].next;
  }
};

SkipList.prototype.clear = function(callback) {
  if(this.root.skips.length < 1) {
    return;
  }
  var p = this.root.skips[0].next;
  while(this.valid(p)) {
    var nextp = p.skips[0].next;
    p.skips = [];
    p = nextp;
  }
  this.root = {key: null, value: null, skips:[]};
};

SkipList.compareArray = function(arr, brr) {
  for(var i=0; i<arr.length; i++) {
    var a = arr[i];
    var b = brr[i];
    if(a == b) {
      continue;
    } else if(a > b) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
};

/*if(module && module.exports) {
  module.exports = SkipList;
}*/

