
/*
 * GET home page.
 */

exports.index = function(req, res){
  //res.render('index');
  res.sendfile('index.html');
};
