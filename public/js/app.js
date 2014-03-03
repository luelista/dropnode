App = Ember.Application.create();

App.Router.map(function() {
  //this.resource('index');
  this.resource('clipboards');
  this.resource('clipboard', { path: ':name' });
  
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return ['red', 'yellow', 'blue'];
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