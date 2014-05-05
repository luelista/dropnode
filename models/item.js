
var db = require('dbconnect')
  , config = require('../config');

exports.getItemFilespec = function(item) {
  return config.server.contents_path + '/' + item.server_filespec;
}

exports.byId = function(item_id, callback) {
  db.mysql.query(
    'SELECT \
       t.*  \
     FROM '+db.SCH.ITEMS+' t \
     WHERE cid = ?', 
      [item_id],
    function(err, results) {
      callback(err, (results && results[0])?results[0]:null);
    }
  );
  
}


