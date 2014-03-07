
var crypto = require("crypto")

module.exports = function(meth, str) {
  return crypto
    .createHash(meth)
    .update(str)
    .digest("hex");
}


