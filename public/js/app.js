App = Ember.Application.create();



App.Router.map(function() {
  //this.resource('index');
  this.resource('clipboards', function() {

    this.route('new');
    this.resource('clipboard', { path: '/:owner/:name' }, function() {
      this.resource('item', { path: ':filename' });
    });
  });
  this.resource('users', function() {
    this.route('login');
    this.route('profile');
  });

  this.route("fourOhFour", { path: "*path"});
});

App.Router.reopen({
  location: 'history'
});

DS.RESTAdapter.reopen({
  namespace: 'api/v1'
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return ['red', 'yellow', 'blue'];
  }
});

// User Login

App.UsersLoginRoute = Ember.Route.extend({
  model: function() {
    return Ember.Object.create();
  },
  beforeModel: function(transition) {
    this.controllerFor('users.login').set('errorMes', '');
  },
  afterModel: function(model, transition) {
      transition.then(function() {
        
      });
    }
});
App.UsersLoginController = Ember.ObjectController.extend({
  errorMes: '',
  actions: {
    loginUser: function() {
      var self = this;
      var router = this.get('target');
      var data = this.getProperties('username_or_email', 'password');

      $.ajax({
        url: '/api/v1/session', type: 'post',
        data: data, 
        headers: {"Authorization":""}, 
        success: function(results) {
          if (results.api_key) {
            App.AuthManager.authenticate(results.api_key.access_token, results.api_key.user_id);
            router.transitionTo('index');
          } else {
            self.set('errorMes', results.error);
          }
        }
      });
    }
  }
});


// Clipboard List

App.ClipboardsRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('clipboard');
  }
});

App.ClipboardsNewRoute = Ember.Route.extend({
  model: function() {
    return Ember.Object.create();
  }
});



App.ClipboardRoute = Ember.Route.extend({
  model: function(params) {
    console.log("model called",params);
    return new Promise(function(resolve, reject){
        var cb = App.Store.find('clipboard', { owner: params.owner, name: params.name });
        
        cb.then(function() {
          console.log("cb resolve", cb.get("firstObject"))
          resolve(cb.get("firstObject"));
        }, reject);
      });
    /*return Em.Deferred.promise(function (p) {
      p.resolve($.get("/api/v1/clipboard/" + params.owner + "/" + params.name).then(function(response) {
        return App.Store.createRecord('clipboard', response.clipboard);
      }));
    });*/
      //return jQuery.getJSON("/posts/" + params.post_slug);
  },
  serialize: function(model) {
    // this will make the URL `/posts/foo-post`
    return { owner: model.get('owner.username'), name: model.get('name') };
  }
});

App.ClipboardIndexRoute = Ember.Route.extend({
  model: function(params) {
    console.log("model (2) called",params);
    return this.modelFor("clipboard");
  }
});





App.ApplicationView = Em.View.extend({
  didInsertElement: function() {
  this.initFoundation()
 },
  initFoundation: function(){
   Em.$(document).foundation()
 }
});

App.User = DS.Model.extend({
  //id:     DS.attr('string'),
  email:    DS.attr('string'),
  username: DS.attr('string'),
  fullname: DS.attr('string')
});

App.Clipboard = DS.Model.extend({
  //id:               DS.attr('string'),
  name:             DS.attr('string'),
  owner:            DS.belongsTo('user'),
  description:      DS.attr('string'),
  state:            DS.attr('string'),
  viewmode:         DS.attr('string'),
  items:            DS.hasMany('item', { async: true })
});

App.Item = DS.Model.extend({
  //id:               DS.attr('string'),
  clipboard:        DS.belongsTo('clipboard'),
  title:            DS.attr('string'),
  filename:         DS.attr('string'),
  url_filename:     DS.attr('string'),
  server_filespec:  DS.attr('string'),
  filetype:         DS.attr('string'),
  subtype:          DS.attr('string'),
  url:              Ember.computed(function() {
    return App.ServerConfig.contents_root + '/' + this.get("server_filespec");
  }).property("url_filename"),
  showThumbnail:              Ember.computed(function() {
    return this.get("filetype") == "photo";
  }).property("filetype")
});

App.ApiToken = Ember.Object.extend({
  accessToken: '',
  user: null
});

App.ApplicationController = Ember.Controller.extend({
  currentUser: function() {
    return App.AuthManager.get('apiToken.user')
  }.property('App.AuthManager.apiToken'),

  isAuthenticated: function() {
    return App.AuthManager.isAuthenticated()
  }.property('App.AuthManager.apiToken')
});

App.ApplicationRoute = Ember.Route.extend({
  init: function() {
    this._super();
    App.AuthManager = AuthManager.create();
    App.Store = this.store;
  },

  actions: {
    logout: function() {
      App.AuthManager.reset();
      this.transitionTo('index');
    }
  }
});

var AuthManager = Ember.Object.extend({

  // Load the current user if the cookies exist and is valid
  init: function() {
    this._super();
    this.store = App.__container__.lookup('store:main');
    var accessToken = $.cookie('access_token');
    var authUserId  = $.cookie('auth_user');
    if (!Ember.isEmpty(accessToken) && !Ember.isEmpty(authUserId)) {
      this.authenticate(accessToken, authUserId);
    }
  },

  // Determine if the user is currently authenticated.
  isAuthenticated: function() {
    return !Ember.isEmpty(this.get('apiToken.accessToken')) && !Ember.isEmpty(this.get('apiToken.user'));
  },

  // Authenticate the user. Once they are authenticated, set the access token to be submitted with all
  // future AJAX requests to the server.
  authenticate: function(accessToken, userId) {
    var self = this;
    $.ajaxSetup({
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    var user = this.store.find('user', userId);
    user.then(function(){
      self.set('apiToken', App.ApiToken.create({
        accessToken: accessToken,
        user: user
      }));
    });
  },

  // Log out the user
  reset: function() {
    //App.__container__.lookup("route:application").transitionTo('sessions.new');
    Ember.run.sync();
    Ember.run.next(this, function(){
      this.set('apiToken', null);
      $.ajaxSetup({
        headers: null//{ 'Authorization': 'Bearer none' }
      });
    });
  },

  // Ensure that when the apiToken changes, we store the data in cookies in order for us to load
  // the user when the browser is refreshed.
  apiTokenObserver: function() {
    if (Ember.isEmpty(this.get('apiToken'))) {
      $.removeCookie('access_token');
      $.removeCookie('auth_user');
    } else {
      $.cookie('access_token', this.get('apiToken.accessToken'), {path:'/'});
      $.cookie('auth_user', this.get('apiToken.user.id'), {path:'/'});
    }
  }.observes('apiToken')
});

// Reset the authentication if any ember data request returns a 401 unauthorized error
DS.rejectionHandler = function(reason) {
  if (reason.status === 401) {
    App.AuthManager.reset();
  }
  throw reason;
};

Ember.Handlebars.registerHelper('ifeq', function(a, b, options) {
  return Ember.Handlebars.bind.call(options.contexts[0], a, options, true, function(result) {
    console.log("ifeq",result,b);
    return result === b;
  });
});
