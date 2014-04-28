
/*
 * GET home page.
 */

exports.index = function(req, res, next){
  console.log(req.url);
  if (req.url.indexOf('/js/') === 0 || req.url.indexOf('/css/') === 0 || !req.accepts('html')) {
    next(); return;
  }
  //res.render('index');
  res.sendfile('public/index.html');
};

exports.err404 = function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('err404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found\n');
};

