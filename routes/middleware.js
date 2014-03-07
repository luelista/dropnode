
var hash = require('../modules/hash');
var AUTH_REGEX = /Bearer ([a-zA-Z0-9,.;:_%-]+)/;

exports.checkauth = function(req, res, next) {
  if (req.headers.authorization) {
    var m;
    if (m = req.headers.authorization.match(AUTH_REGEX)) {
      var key = m[1].split(/:/);
      if (key.length == 4 && hash('sha1', key[0]+':'+key[1]+':'+key[2]) == key[3]) {
        req.authorized = { username: key[1], id: key[2] };
        next();
        return;
      }
    }
    res.status(400);
    res.type('txt').send("Malformed Authorization header");
    return;
  }
  req.authorized = false;
  next();
}

exports.requireauth = function(req, res, next) {
  if (! req.authorized) {
    res.status(403);
    res.type('txt').send("Not authorized");
    return;
  }
  next();
}

