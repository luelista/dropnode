


Dropme.UserProfile = Backbone.View.extend({
  template: _.myTemplate('userProfile'),
  render: function(user) {
    App.loadIndicator.render();
    $.get("/api/v1/users/" + user, function(userInfo) {
      //this.hideLoadIndicator();
      var html = this.template({ user: userInfo.user });
      $("#main-content").html(html);
      $.get("/api/v1/clipboards?owner=" + escape(userInfo.user.username), function(cb) {
        var coll = new Dropme.ClipboardCollection(cb.clipboards);
        this.clipboardList = new Dropme.ClipboardList({ el: this.$(".clipboard-list"), model: coll });
        this.clipboardList.render();
      }.bind(this));
      
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
  
  gotoClipboard: function(e) {
    var href = e.currentTarget.getAttribute('data-internal');
    App.router.navigate(href, {trigger:true});
    return false;
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
    this.listenTo(App, "change:breadCrumb", this.render);
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
      breadCrumb: App.get('breadCrumb'),
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
  events: {
    'click .on-style': 'onStyle'
  },
  activeItem: null,
  onStyle: function(e) {
    this.$('.content').attr('data-style', e.currentTarget.getAttribute('data-style'));
  },
  initialize: function() {
    $(window).on('resize', this.resize.bind(this));
  },
  resize: function() {
    this.$('.content').css('height', $(window).height()-80+'px');
  },
  itemClick: function(item) {
    console.log(item);
    console.log(item.model.filename);
    //this.$('.itemdetails').html(item.model.filename);
    if (this.activeItem != null) {
      this.activeItem.model.active = false;
      this.activeItem.render();
    }
    item.model.active = true;
    item.render();
    this.activeItem = item;
    var details = new Dropme.ClipboardItemDetails({ el: this.$('.itemdetails'), model: item.model });
    details.render();
  },
  render: function(user, board) {
    App.loadIndicator.render();
    $.get("/api/v1/clipboards?owner=" + escape(user) + "&name=" + escape(board), function(boardInfo) {
      //this.hideLoadIndicator();
      var cb = boardInfo.clipboards[0];
      var html = this.template({ cb: cb });
      $("#main-content").html(html);
      var list = new Dropme.ClipboardItemList({ el: this.$el.find('.content') });
      list.render(cb.links.items);
      console.log(list, this.itemClick);
      this.listenTo(list, 'itemClicked', this.itemClick);
      
      App.setBreadcrumb(0, { text: board });
      this.resize();
    }.bind(this));
  }
});

Dropme.ClipboardItemList = Backbone.View.extend({
  itemClicked: function(item) {
    console.log(222)
    this.trigger('itemClicked', item);
  },
  render: function(link) {
    $.get(link, function(list) {
      for(var i in list.items) {
        var n = new Dropme.ClipboardItem({ model: list.items[i] });
        n.render();
        this.listenTo(n, 'itemClicked', this.itemClicked);
        this.$el.append(n.el);
      }
    }.bind(this));
  }
});

Dropme.ClipboardItem = Backbone.View.extend({
  template: _.myTemplate('clipboardItem'),
  tagName: 'div',
  className: 'clipboard-item',
  events: {
    'click li': 'itemClick'
  },
  itemClick: function() {
    console.log("itemClick");
    this.trigger('itemClicked', this);
  },
  render: function() {
    var html = this.template({ item: this.model });
    $(this.el).html(html);
  }
});

Dropme.ClipboardItemDetails = Backbone.View.extend({
  template: _.myTemplate('clipboardItemDetails'),
  tagName: 'div',
  initialize: function() {
    App.setBreadcrumb(1, { text: this.model.filename });
  },
  render: function() {
    var html = this.template({ item: this.model });
    $(this.el).html(html);
    if (this.model.filetype == "text") {
      $.get("/api/v1/item/" + escape(this.model.cid) + "/plaintext", function(result) {
        this.$(".item-content").text(result).css('white-space', 'prewrap');
      }.bind(this), "text");
    }
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
    
    this.clipboardList = new Dropme.ClipboardList({ el: this.$(".clipboard-list"), model: App.clipboards });
    this.clipboardList.render();
  
  }
});

