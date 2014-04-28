


Dropme.UserProfile = Backbone.View.extend({
  template: _.myTemplate('userProfile'),
  render: function(user) {
    App.loadIndicator.render();
    $.get("/api/v1/users/" + user, function(userInfo) {
      //this.hideLoadIndicator();
      var html = this.template({ user: userInfo.user });
      $("#main-content").html(html);
    }.bind(this));
  }
});

Dropme.LoadIndicator = Backbone.View.extend({
  template: _.myTemplate('loadIndicator'),
  render: function() {
    var html = this.template({});
    $("#main-content").html(html);
  }
});

Dropme.ClipboardList = Backbone.View.extend({
  template: _.myTemplate('clipboardList'),
  events: {
    "click a":          "gotoClipboard"
  },

  initialize: function() {
    this.listenTo(this.model, "change add remove reset", this.render);
  },

  render: function() {
    //console.log("render",this.model)
    var html = this.template({
      model: this.model
    });
    
    $(this.el).html(html);
  }

});

Dropme.MainMenu = Backbone.View.extend({
  template: _.myTemplate('mainMenu'),
  events: {
    "click a.action-logout":          "logout",
    "click a[data-internal]":          "menuNav"
  },
  
  menuNav: function(e) {
    var href = e.currentTarget.getAttribute('data-internal');
    App.router.navigate(href.substr(1), {trigger:true});
    return false;
  },
  
  initialize: function() {
    this.listenTo(App, "change:session", this.render);
    this.listenTo(App, "change:currentUser", this.render);
    this.listenTo(App.router, "route", function(route) {
      this.currentRoute = route;
      this.render();
    })
  },

  render: function() {
    var html = this.template({
      //model: this.model
      isAuthenticated : !!App.get('session'),
      currentUser: App.get('currentUser'),
      currentClipboard: null
    });
    
    $(this.el).html(html);
    this.$('[data-route="'+this.currentRoute+'"]').addClass("active");
    this.clipboardListDropdown = new Dropme.ClipboardList({ el: this.$(".clipboard-list"), model: App.clipboards });
    this.clipboardListDropdown.render();
    $(document).foundation();
  },
  
  logout: function() {
    App.logout();
  }

});

Dropme.LoginForm = Backbone.View.extend({
  template: _.myTemplate('loginForm'),
  events: {
    "submit form":          "action"
  },

  initialize: function() {
    //this.listenTo(this.model, "change", this.render);
  },

  render: function() {
    var html = this.template({
    });
    
    $(this.el).html(html);
    this.$('.errmes').hide();
  },
  
  action: function() {
    $.ajax({
      type: 'post', url: '/api/v1/session', headers: {"Authorization":""},
      data: { username_or_email: this.$('[name=username_or_email]').val(), password: this.$('[name=password]').val() }, 
      success: function(result) {
        if (result.error) {
          this.$('.errmes').show().html('Falsches Passwort');
        } else {
          App.login(result.api_key, function() {
            App.forceNavigate('');
          });
        }
      }.bind(this)
    });
    
    return false;
  }

});

Dropme.UserProfilePage = Backbone.View.extend({
  template: _.myTemplate('userProfile'),
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
  },
  render: function() {
    console.log("render upp")
    var html = this.template({ user: this.model });
    
    $(this.el).html(html);
  }
});
Dropme.ClipboardNewPage = Backbone.View.extend({
  template: _.myTemplate('clipboardNew'),
  render: function() {
    var html = this.template({  });
    
    $(this.el).html(html);
  }
});

Dropme.ClipboardContentPage = Backbone.View.extend({
  template: _.myTemplate('clipboardContent'),
  render: function(user, board) {
    App.loadIndicator.render();
    $.get("/api/v1/clipboards?user=" + escape(user) + "&name=" + escape(board), function(boardInfo) {
      //this.hideLoadIndicator();
      var html = this.template({ cb: boardInfo.clipboard });
      $("#main-content").html(html);
    }.bind(this));
  }
});

Dropme.SessionNewPage = Backbone.View.extend({
  template: _.myTemplate('sessionNew'),
  render: function() {
    var html = this.template({  });
    
    $(this.el).html(html);
    this.loginForm = new Dropme.LoginForm({ el: this.$('.login-form') });
    this.loginForm.render();
  }
});
Dropme.IndexPage = Backbone.View.extend({
  template: _.myTemplate('indexNologin'),
  render: function() {
    var html = this.template({  });
    
    $(this.el).html(html);
    if (!App.get('session')) {
      this.loginForm = new Dropme.LoginForm({ el: this.$('.login-form') });
      this.loginForm.render();
    }
  }
});


Dropme.DashboardPage = Backbone.View.extend({
  template: _.myTemplate('dashboard'),
  render: function() {
    var html = this.template({  });
    
    $(this.el).html(html);
    if (!App.get('session')) {
      this.loginForm = new Dropme.LoginForm({ el: this.$('.login-form') });
      this.loginForm.render();
    }
  }
});

