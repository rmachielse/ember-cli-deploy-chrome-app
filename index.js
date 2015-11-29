/* jshint node: true */
'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var BasePlugin = require('ember-cli-deploy-plugin');
var ChromeExtension = require('crx');
var path = require('path');
var fs = require('fs.extra');

module.exports = {
  name: 'ember-cli-deploy-chrome-app',

  createDeployPlugin: function(options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: {
        inputPath: 'chrome',
        outputPath: 'chrome',
        keyPath: 'key.pem',
        root: function(context) {
          return context.project.root;
        },
        name: function(context) {
          return context.project.pkg.name;
        },
        distDir: function(context) {
          return context.distDir;
        }
      },

      didBuild: function(context) {
        var root = this.readConfig('root');
        var name = this.readConfig('name');
        var codebase = this.readConfig('codebase');
        var distDir = this.readConfig('distDir');
        var keyPath = this.readConfig('keyPath');
        var inputPath = this.readConfig('inputPath');
        var outputPath = this.readConfig('outputPath');

        var zipFile = path.join(outputPath, name + '.zip');
        var crxFile = path.join(outputPath, name + '.crx');
        var xmlFile = path.join(outputPath, 'update.xml');

        this.log('creating chrome app...', { verbose: true });

        this.distFiles = [];

        return this._ensureOutputPath(distDir, outputPath)
          .then(this._loadPrivateKey.bind(this, root, keyPath))
          .then(this._createExtension.bind(this, root, inputPath, codebase))
          .then(this._loadExtension.bind(this))
          .then(this._createZipFile.bind(this, codebase === null, distDir, zipFile))
          .then(this._packageExtension.bind(this))
          .then(this._createCrxFile.bind(this, codebase !== null, distDir, crxFile))
          .then(this._createUpdateXmlFile.bind(this, codebase !== null, distDir, xmlFile))
          .then(function() {
            this.log('packaged chrome app succesfully', { verbose: true });

            return { distFiles: this.distFiles };
          }.bind(this));
      },

      _ensureOutputPath: function(distDir, outputPath) {
        return new Promise(function(resolve, reject) {
          fs.exists(path.join(distDir, outputPath), function(exists) {
            if (exists) {
              resolve();
            } else {
              fs.mkdirp(path.join(distDir, outputPath), function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        });
      },

      _loadPrivateKey: function(root, keyPath) {
        return new Promise(function(resolve, reject) {
          fs.readFile(path.join(root, keyPath), function(err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      },

      _createExtension: function(root, inputPath, codebase, privateKey) {
        this.crx = new ChromeExtension({
          rootDirectory: path.join(root, inputPath),
          codebase: codebase,
          privateKey: privateKey
        });

        return this.crx.load();
      },

      _loadExtension: function() {
        return this.crx.loadContents();
      },

      _createZipFile: function(create, distDir, zipFile, archiveBuffer) {
        var _this = this;

        if (create) {
          return new Promise(function(resolve, reject) {
            fs.writeFile(path.join(distDir, zipFile), archiveBuffer, function(err) {
              if (err) {
                reject(err);
              } else {
                _this.distFiles.push(zipFile);
                _this.log('✔ ' + zipFile, { verbose: true });

                resolve(archiveBuffer);
              }
            });
          });
        } else {
          return Promise.resolve(archiveBuffer);
        }
      },

      _packageExtension: function(archiveBuffer) {
        return this.crx.pack(archiveBuffer);
      },

      _createCrxFile: function(create, distDir, crxFile, crxBuffer) {
        var _this = this;

        if (create) {
          return new Promise(function(resolve, reject) {
            fs.writeFile(path.join(distDir, crxFile), crxBuffer, function(err) {
              if (err) {
                reject(err);
              } else {
                _this.distFiles.push(crxFile);
                _this.log('✔ ' + crxFile, { verbose: true });

                resolve();
              }
            });
          });
        } else {
          return Promise.resolve();
        }
      },

      _createUpdateXmlFile: function(create, distDir, xmlFile) {
        var _this = this;
        var xmlBuffer = this.crx.generateUpdateXML();

        if (create) {
          return new Promise(function(resolve, reject) {
            fs.writeFile(path.join(distDir, xmlFile), xmlBuffer, function(err) {
              if (err) {
                reject(err);
              } else {
                _this.distFiles.push(xmlFile);
                _this.log('✔ ' + xmlFile, { verbose: true });

                resolve();
              }
            });
          });
        } else {
          return Promise.resolve();
        }
      }
    });

    return new DeployPlugin();
  }
};
