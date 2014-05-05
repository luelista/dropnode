
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , middleware = require('./routes/middleware')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , hash = require('./modules/hash')
  , config = require('./config.js')
  , clipboards = require('./models/clipboard')
  , items = require('./models/item')
  , db = require('dbconnect')
  , fs = require('fs');


var app = express();
var contentsApp = express();

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
  db.mysql.query('SELECT username,id FROM '+db.SCH.USERS+' WHERE (username = ? OR email = ?) AND password = ?',
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
  db.mysql.query('SELECT id,username,fullname,email,profile_image FROM '+db.SCH.USERS+' WHERE id = ? OR username = ?',
  [req.params.id, req.params.id], function(err, results) {
    if (results) {
      res.send({ user: results[0] });
    } else {
      res.status(500);
      res.send({ error: "error" });
    }
  })
});

app.get('/api/v1/my/tags/:tag', function(req, res) {
  if (!req.authorized) {
    res.status(403);
    res.send({ error: "forbidden" });
    return;
  }
  db.mysql.query(
    'SELECT f.alias,f.color,c.owner username,c.description, state, viewmode, c.cbid id, name,f.tag FROM twiki_clipfav AS f INNER JOIN twiki_clipboard AS c ON \
     f.cbid=c.cbid WHERE c.deleted=0 AND f.uid = ? AND f.tag = ?', [ req.authorized.id, req.params.tag ],
    function(err, results) {
      if (err) { res.status(500); res.send({error: err}); return; }
      for(var i in results) {
        results[i].links = {items: '/api/v1/clipboards/'+results[i].id+'/items'};
      }
      res.send({ clipboards: results });
    }
  );
});

app.get('/api/v1/clipboards', function(req, res) {
  if (!req.authorized) {
    res.send({ clipboards: [], users: [] });
    return;
  }
  var whereClause = 'owner = ? OR accepted_username = ?', whereParms = [req.authorized.username, req.authorized.username];
  if (req.query.owner && req.query.name) {
    whereClause = 'owner = ? AND name = ? AND (state > 1 OR owner = ? OR accepted_username = ?)'; whereParms = [req.query.owner, req.query.name, req.authorized.username, req.authorized.username];
  } else if (req.query.owner) {
    whereClause = 'owner = ? AND (state > 1 OR owner = ? OR accepted_username = ?)'; whereParms = [req.query.owner, req.authorized.username, req.authorized.username];
  }
  db.mysql.query(
    'SELECT \
       c.cbid id, name, u.id owner, u.username, u.fullname, c.description, state, viewmode  \
     FROM '+db.SCH.CLIPBOARDS+' c INNER JOIN '+db.SCH.USERS+' u ON c.owner=u.username \
       LEFT OUTER JOIN '+db.SCH.INVITES+' i ON c.cbid = i.cbid \
     WHERE ('+whereClause+') ORDER BY created DESC', 
      whereParms,
    function(err, results) {
      if (err) { res.status(500); res.send({error: err}); return; }
      console.log("sending ",err)
      for(var i in results) {
        results[i].links = {items: '/api/v1/clipboards/'+results[i].id+'/items'};
      }
      res.send({ clipboards: results });
    }
  );
});
/*
app.get('/api/v1/clipboard/:owner/:name', function(req, res) {
  if (!req.authorized || req.authorized.username != req.params.owner) {
    res.send({ error : "forbidden" });
    return;
  }
  db.mysql.query(
    'SELECT \
       cbid id, name, u.id owner, description, state, viewmode  \
     FROM '+db.SCH.CLIPBOARDS+' c INNER JOIN '+db.SCH.USERS+' u ON c.owner=u.username \
     WHERE owner = ? AND name = ? ', 
      [req.params.owner, req.params.name],
    function(err, clipboardr) {
      if (err) { res.status(500); res.send({error: err}); return; } 
      
      
      db.mysql.query(
        'SELECT cid id, title,filename,url_filename,server_filespec,created_by,created,lastmodified_by,lastmodified,filetype,subtype,filesize \
         FROM '+db.SCH.ITEMS+' WHERE cbid = ? AND deleted = 0 ORDER BY created DESC ', 
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
  clipboards.byId(req.authorized.username, req.params.id, function(err, cb) {
    if (err || !cb) {
      res.send({ error : err ? err : "not found" });
    }
    db.mysql.query(
      'SELECT cid id, title,filename,url_filename,server_filespec,created_by,created,lastmodified_by,lastmodified,filetype,subtype,filesize \
       FROM '+db.SCH.ITEMS+' WHERE cbid = ? AND deleted = 0 ORDER BY created DESC ', 
      [req.params.id],
      function(err, itemsr) {
        if (err) { res.status(500); res.send({error: err}); return; } 
        
        res.send({ items: itemsr });
      }
    );
  });
});

app.get('/api/v1/item/:id/raw', function(req, res) {
  items.byId(req.params.id, function(err, item) {
    if (err || !item) {
      res.send({ error : err ? err : "item not found" }); return;
    }
    clipboards.byId(req.authorized ? req.authorized.username : false, item.cbid, function(err, cb) {
      if (err || !cb) {
        res.send({ error : err ? err : "not found" }); return;
      }
      res.sendfile(items.getItemFilespec(item));
    });
  });
});

app.get('/api/v1/item/:id/:size.jpg', function(req, res) {
  items.byId(req.params.id, function(err, item) {
    if (err || !item) {
      res.send({ error : err ? err : "item not found" }); return;
    }
    clipboards.byId(req.authorized ? req.authorized.username : false, item.cbid, function(err, cb) {
      if (err || !cb) {
        res.send({ error : err ? err : "not found" }); return;
      }
      var size = parseInt(req.params.size);
      var dir = path.dirname(items.getItemFilespec(item));
      res.header('Cache-Control', 'public, max-age=368400');
      res.sendfile(dir + '/thumb' + size + '.jpg');
    });
  });
});

app.get('/api/v1/item/:id/plaintext', function(req, res) {
  items.byId(req.params.id, function(err, item) {
    if (err || !item) {
      res.send({ error : err ? err : "item not found" }); return;
    }
    clipboards.byId(req.authorized ? req.authorized.username : false, item.cbid, function(err, cb) {
      if (err || !cb) {
        res.send({ error : err ? err : "not found" }); return;
      }
      fs.readFile(items.getItemFilespec(item), function(err, content) {
        res.type('text/plain');
        res.send(content);
      });
    });
  });
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

