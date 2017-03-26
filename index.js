/* eslint-env node */
'use strict';

const { Promise } = require('rsvp');
const BasePlugin = require('ember-cli-deploy-plugin');
const ChromeExtension = require('crx');
const path = require('path');
const fs = require('fs.extra');

module.exports = {
  name: 'ember-cli-deploy-chrome-app',

  createDeployPlugin({ name }) {
    const DeployPlugin = BasePlugin.extend({
      name,

      defaultConfig: {
        inputPath: 'chrome',
        outputPath: 'chrome',
        keyPath: 'key.pem',
        root({ project: { root } }) {
          return root;
        },
        name({ project: { pkg: { name } } }) {
          return name;
        },
        distDir({ distDir }) {
          return distDir;
        }
      },

      didBuild(context) {
        let root = this.readConfig('root');
        let name = this.readConfig('name');
        let codebase = this.readConfig('codebase');
        let distDir = this.readConfig('distDir');
        let keyPath = this.readConfig('keyPath');
        let inputPath = this.readConfig('inputPath');
        let outputPath = this.readConfig('outputPath');

        let zipFile = path.join(outputPath, `${name}.zip`);
        let crxFile = path.join(outputPath, `${name}.crx`);
        let xmlFile = path.join(outputPath, 'update.xml');

        this.log('creating chrome app...', { verbose: true });

        this.distFiles = [];

        return this._ensureOutputPath(distDir, outputPath)
          .then(this._loadPrivateKey.bind(this, root, keyPath))
          .then(this._createExtension.bind(this, root, inputPath, codebase))
          .then(this._loadExtension.bind(this))
          .then(this._createZipFile.bind(this, typeof codebase === 'undefined', distDir, zipFile))
          .then(this._packageExtension.bind(this))
          .then(this._createCrxFile.bind(this, typeof codebase !== 'undefined', distDir, crxFile))
          .then(this._createUpdateXmlFile.bind(this, typeof codebase !== 'undefined', distDir, xmlFile))
          .then(() => {
            this.log('packaged chrome app succesfully', { verbose: true });

            return { distFiles: this.distFiles };
          });
      },

      _ensureOutputPath(distDir, outputPath) {
        return new Promise((resolve, reject) => {
          fs.exists(path.join(distDir, outputPath), (exists) => {
            if (exists) {
              resolve();
            } else {
              fs.mkdirp(path.join(distDir, outputPath), (err) => {
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

      _loadPrivateKey(root, keyPath) {
        return new Promise((resolve, reject) => {
          fs.readFile(path.join(root, keyPath), (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      },

      _createExtension(root, inputPath, codebase, privateKey) {
        this.crx = new ChromeExtension({
          rootDirectory: path.join(root, inputPath),
          codebase,
          privateKey
        });

        return this.crx.load();
      },

      _loadExtension() {
        return this.crx.loadContents();
      },

      _createZipFile(create, distDir, zipFile, archiveBuffer) {
        if (create) {
          return new Promise((resolve, reject) => {
            fs.writeFile(path.join(distDir, zipFile), archiveBuffer, (err) => {
              if (err) {
                reject(err);
              } else {
                this.distFiles.push(zipFile);
                this.log(`✔ ${zipFile}`, { verbose: true });

                resolve(archiveBuffer);
              }
            });
          });
        } else {
          return Promise.resolve(archiveBuffer);
        }
      },

      _packageExtension(archiveBuffer) {
        return this.crx.pack(archiveBuffer);
      },

      _createCrxFile(create, distDir, crxFile, crxBuffer) {
        if (create) {
          return new Promise((resolve, reject) => {
            fs.writeFile(path.join(distDir, crxFile), crxBuffer, (err) => {
              if (err) {
                reject(err);
              } else {
                this.distFiles.push(crxFile);
                this.log(`✔ ${crxFile}`, { verbose: true });

                resolve();
              }
            });
          });
        } else {
          return Promise.resolve();
        }
      },

      _createUpdateXmlFile(create, distDir, xmlFile) {
        if (create) {
          let xmlBuffer = this.crx.generateUpdateXML();

          return new Promise((resolve, reject) => {
            fs.writeFile(path.join(distDir, xmlFile), xmlBuffer, (err) => {
              if (err) {
                reject(err);
              } else {
                this.distFiles.push(xmlFile);
                this.log(`✔ ${xmlFile}`, { verbose: true });

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
