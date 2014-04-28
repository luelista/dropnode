
window.Dropme = { Models: {}, App: null };

var ApplicationModel = Backbone.Model.extend({
  currentUser: null,
  session: null,
  currentRoute: '',
  clipboards: null,
  
  logout: function() {
    this.set('session', null);
    this.set('currentUser', null);
    App.clipboards.reset();
    App.forceNavigate('');
  },
  initialize: function() {
  },
  login: function(session, callback) {
    this.set('session', session);
    if (window.localStorage) {
      window.localStorage.apiKey = JSON.stringify(session);
    }
    $.ajaxSetup({
      headers: session ? { 'Authorization': 'Bearer ' + session.access_token } : null
    });
    if (session) {
      var user = new Dropme.User({ id: session.user_id });
      user.fetch({success:function() {
        App.set('currentUser', user);
        App.clipboards.fetch();
        callback();
      }});
    }
  }
});

window.App = Dropme.App = new ApplicationModel();

App.forceNavigate = function(target) {
  Backbone.history.fragment = 'xxx';
  Backbone.history.navigate(target, {trigger:true});
}

var viewHelpers = {
  linkTo: function(route, url, model, wrapperTag, text) {
    url = url.replace(/:([a-z]+)/, function(x,paramName) {return model.get?model.get(paramName):model[paramName];});
    var html = '<a href="' + url + '" data-route="' + route + '" data-internal="' + url + '">' + text + '</a>';
    if (wrapperTag) html = '<' + wrapperTag + ' data-route="' + route + '">' + html + '</' + wrapperTag + '>';
    return html;
  }
};

_.myTemplate = function(id){
  var tpl = _.template( $('#template-' + id).html());
  return function(data) {
    data = _.extend(data, viewHelpers);
    return tpl(data);
  };
};

// https://gist.github.com/trydionel/719080
_.extend(Backbone.Model.prototype, {
  // In order to properly wrap/unwrap Rails JSON data, we need to specify
  // what key the object will be wrapped with.
  _name : function() {
    if (!this.name) throw new Error("A 'name' property must be specified");
    return this.name;
  },
  // This is called on all models coming in from a remote server.
  // Unwraps the given response from the default Rails format.
  parse : function(resp) {
    return resp[this._name()] ? resp[this._name()] : resp;
  },
});

Dropme.WorkspaceRouter = Backbone.Router.extend({

  routes: {
    "":                     "index",
    "c/:user/:board":             "clipboard_contents",
    "new":                  "clipboard_new",    
    "session/new":          "session_new",
    "user/:username":       "user_profile",
    "search/:query":        "search",
    "search/:query/p:page": "search"
  },

  help: function() {
    //...
  },

  search: function(query, page) {
    //...
  },
  
  index: function() {
    App.indexPage.render();
  },
  
  user_profile: function(username) {
    App.userProfile.render(username);
  },
  
  clipboard_new: function() {
    App.clipboardNewPage.render();
  },
  
  clipboard_contents: function(user, board) {
    App.clipboardContentPage.render(user, board);
  },
  
  session_new: function() {
    App.sessionNewPage.render();
  }

});

Dropme.Error404Router = Backbone.Router.extend({
  initialize: function() {
    this.route(/.*/, "error_404", function() {
      $("#main-content").html($("#template-fourOhFour").html());
    });
  }
});

Dropme.User = Backbone.Model.extend({
  name: 'user',
  urlRoot: '/api/v1/users/'
});

Dropme.Clipboard = Backbone.Model.extend({
  name: 'clipboard'
});

Dropme.ClipboardCollection = Backbone.Collection.extend({
  url: '/api/v1/clipboards',
  model: Dropme.Clipboard,
  parse: function(resp) {
    return resp.clipboards;
  },
  initialize: function() {
    this.listenTo(App, 'change:session', this.fetch);
  }
});



