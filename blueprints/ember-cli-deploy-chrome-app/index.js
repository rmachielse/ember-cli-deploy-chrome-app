var RSVP = require('rsvp');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var Promise = RSVP.Promise;

module.exports = {
  normalizeEntityName: function() {},

  locals: function(options) {
    return {
      capitalizedPackageName: options.project.pkg.name.slice(0, 1).toUpperCase() + options.project.pkg.name.slice(1),
      packageName: options.project.pkg.name,
      packageDescription: options.project.pkg.description,
      packageVersion: options.project.pkg.version
    };
  },

  afterInstall: function(options) {
    return Promise.all([
      this._symlinkAssets(options),
      this._symlinkWindow(options),
      this._generateKey(options)
    ]);
  },

  _symlinkAssets: function(options) {
    return new Promise(function(resolve, reject) {
      fs.symlink('../tmp/deploy-dist/assets', options.project.root + '/chrome/assets', 'dir', resolve);
    });
  },

  _symlinkWindow: function(options) {
    return new Promise(function(resolve, reject) {
      fs.symlink('../tmp/deploy-dist/index.html', options.project.root + '/chrome/window.html', resolve);
    });
  },

  _generateKey: function(options) {
    var crx = path.join(__dirname, '..', '..', '..', 'crx', 'bin', 'crx.js');

    return new Promise(function(resolve, reject) {
      exec(crx + ' keygen ' + options.project.root, resolve);
    });
  }
};
