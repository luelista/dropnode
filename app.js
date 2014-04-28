
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , middleware = require('./routes/middleware')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , mysql = require('mysql')
  , hash = require('./modules/hash')
  , config = require('./config.js');

var SCH = {};
for (var k in config.schemas) {
  if (config.schemas.hasOwnProperty(k)) SCH[k] = config.db.prefix + config.schemas[k];
}

var app = express();
var contentsApp = express();

config.db.multipleStatements = true;
var connection = mysql.createConnection(config.db);

connection.connect(function(err) {  });

app.configure(function(){
  app.set('port', process.env.PORT || config.server.http_port || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  console.log("registering contents vhost on '"+config.server.contents_host+"'...");
  app.use(express.vhost(config.server.contents_host, contentsApp));
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.checkauth);
  //app.use(express.cookieParser('your secret here'));
  //app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.post('/api/v1/session', function( req, res ) {
  var pwhash = hashPassword(req.body.password);
  connection.query('SELECT username,id FROM '+SCH.USERS+' WHERE (username = ? OR email = ?) AND password = ?',
  [req.body.username_or_email, req.body.username_or_email, pwhash], function(err, data) {
    if (data && data.length == 1) {
      res.send({ api_key: {
        access_token: "key:"+data[0].username+":"+data[0].id+":"+hash('sha1',"key:"+data[0].username+":"+data[0].id),
        user_id: data[0].id
      } });
    } else {
      res.send({ error: err?err:"invalid login" });
    }
  });
});
app.get('/api/v1/session', function( req, res ) {
  res.send({ api_key:  { access_token: "asdf" } });
});
app.get('/api/v1/users/:id', middleware.requireauth, function( req, res ) {
  if (req.params.id != req.authorized.id && req.params.id != req.authorized.username) {
    res.status(403);
    res.send({ error: "forbidden" });
    return;
  }
  connection.query('SELECT id,username,fullname,email,profile_image FROM '+SCH.USERS+' WHERE id = ? OR username = ?',
  [req.params.id, req.params.id], function(err, results) {
    if (results) {
      res.send({ user: results[0] });
    } else {
      res.status(500);
      res.send({ error: "error" });
    }
  })
});

app.get('/api/v1/clipboards', function(req, res) {
  if (!req.authorized) {
    res.send({ clipboards: [], users: [] });
    return;
  }
  var whereClause = 'owner = ? OR accepted_username = ?', whereParms = [req.authorized.username, req.authorized.username];
  if (req.query.owner && req.query.name) {
    whereClause = 'owner = ? AND name = ?'; whereParms = [req.query.owner, req.query.name];
  }
  connection.query(
    'SELECT \
       c.cbid id, name, u.id owner, u.username, u.fullname, c.description, state, viewmode  \
     FROM '+SCH.CLIPBOARDS+' c INNER JOIN '+SCH.USERS+' u ON c.owner=u.username \
       LEFT OUTER JOIN '+SCH.INVITES+' i ON c.cbid = i.cbid \
     WHERE ('+whereClause+') ORDER BY created DESC', 
      whereParms,
    function(err, results) {
      if (err) { res.status(500); res.send({error: err}); return; }
      console.log("sending ",err)
      var users = [];
      for(var i in results) {
        users.push({ id: results[i].owner, username: results[i].username, fullname: results[i].fullname });
        delete results[i].username;
        delete results[i].fullname;
        results[i].links = {items: '/api/v1/clipboards/'+results[i].id+'/items'};
      }
      res.send({ clipboards: results, users: users });
    }
  );
});
/*
app.get('/api/v1/clipboard/:owner/:name', function(req, res) {
  if (!req.authorized || req.authorized.username != req.params.owner) {
    res.send({ error : "forbidden" });
    return;
  }
  connection.query(
    'SELECT \
       cbid id, name, u.id owner, description, state, viewmode  \
     FROM '+SCH.CLIPBOARDS+' c INNER JOIN '+SCH.USERS+' u ON c.owner=u.username \
     WHERE owner = ? AND name = ? ', 
      [req.params.owner, req.params.name],
    function(err, clipboardr) {
      if (err) { res.status(500); res.send({error: err}); return; } 
      
      
      connection.query(
        'SELECT cid id, title,filename,url_filename,server_filespec,created_by,created,lastmodified_by,lastmodified,filetype,subtype,filesize \
         FROM '+SCH.ITEMS+' WHERE cbid = ? AND deleted = 0 ORDER BY created DESC ', 
        [clipboardr[0].id],
        function(err, itemsr) {
          if (err) { res.status(500); res.send({error: err}); return; } 
          
          res.send({ clipboard: clipboardr[0], items: itemsr });
        }
      );
      
      
    }
  );
});
*/
app.get('/api/v1/clipboards/:id/items', function(req, res) {
  if (!req.authorized) {
    res.send({ error : "forbidden" });
    return;
  }
      
      connection.query(
        'SELECT cid id, title,filename,url_filename,server_filespec,created_by,created,lastmodified_by,lastmodified,filetype,subtype,filesize \
         FROM '+SCH.ITEMS+' WHERE cbid = ? AND deleted = 0 ORDER BY created DESC ', 
        [req.params.id],
        function(err, itemsr) {
          if (err) { res.status(500); res.send({error: err}); return; } 
          
          res.send({ items: itemsr });
        }
      );
      
});
app.get('/api/v1/nodeconfig', function(req, res) {
  var conf = {
      contents_root: 'https://' + config.server.contents_host
  };
  res.setHeader("Content-Type", "text/javascript");
  res.send("// Config JSONP\n\nApp = App || {};\n\nApp.ServerConfig = " + JSON.stringify(conf));
  
})

app.use(routes.index);

app.use(routes.err404);

//--> vhost for content serving

contentsApp.configure(function(){
  contentsApp.set('views', __dirname + '/views');
  contentsApp.set('view engine', 'jade');
});

contentsApp.use(express.static(config.server.contents_path));
contentsApp.use(routes.err404);

//--> run the server!

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

//--> helpers

function hashPassword(str) {
  return hash(config.security.password_hash, config.security.password_salt + str);
}

