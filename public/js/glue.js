
$(function(){
  new Dropme.Error404Router();
  
  if (window.localStorage && window.localStorage.apiKey) {
    App.login(JSON.parse(window.localStorage.apiKey), function(){});
  }
  
  App.router = new Dropme.WorkspaceRouter();
  App.clipboards = new Dropme.ClipboardCollection();
  App.mainMenu = new Dropme.MainMenu({el: $('nav.top-bar')});
  
  App.loadIndicator = new Dropme.LoadIndicator({el: $('#main-content')});
  App.userProfile = new Dropme.UserProfile({el: $('#main-content')});
  App.indexPage = new Dropme.IndexPage({el: $('#main-content')});
  App.dashboardPage = new Dropme.DashboardPage({el: $('#main-content')});
  App.clipboardNewPage = new Dropme.ClipboardNewPage({el: $('#main-content')});
  App.clipboardContentPage = new Dropme.ClipboardContentPage({el: $('#main-content')});
  App.sessionNewPage = new Dropme.SessionNewPage({el: $('#main-content')});
  
  Backbone.history.start({pushState: true});
  
});

