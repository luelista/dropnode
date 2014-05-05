
var db = require('dbconnect');

exports.byId = function(owner_username, clipboard_id, callback) {
  var whereClause = 'state > 1 OR owner = ? OR accepted_username = ?'; 
  var whereParms = [ owner_username, owner_username];
  if (!owner_username) { whereClause = "state > 1"; whereParams = []; }
  db.mysql.query(
    'SELECT \
       c.cbid id, name, u.id owner, u.username, u.fullname, c.description, state, viewmode  \
     FROM '+db.SCH.CLIPBOARDS+' c INNER JOIN '+db.SCH.USERS+' u ON c.owner=u.username \
       LEFT OUTER JOIN '+db.SCH.INVITES+' i ON c.cbid = i.cbid \
     WHERE c.cbid = ? AND ('+whereClause+') ORDER BY created DESC', 
      [clipboard_id].concat(whereParms),
    function(err, results) {
      callback(err, (results && results[0])?results[0]:null);
    }
  );
  
}


