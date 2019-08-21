'use strict';

const { Promise } = require('rsvp');
const BasePlugin = require('ember-cli-deploy-plugin');
const ChromeExtension = require('crx');
const path = require('path');
const fs = require('fs-extra');
const webStore = require('chrome-webstore-upload');

module.exports = {
  name: 'ember-cli-deploy-chrome-app',

  createDeployPlugin({ name }) {
    const DeployPlugin = BasePlugin.extend({
      name,

      defaultConfig: {
        inputPath: 'chrome',
        outputPath: 'chrome',
        keyPath: 'key.pem',
        publishTarget: 'default',
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
        let extensionId = this.readConfig('extensionId');
        let distDir = this.readConfig('distDir');
        let keyPath = this.readConfig('keyPath');
        let inputPath = this.readConfig('inputPath');
        let outputPath = this.readConfig('outputPath');
        let updateUrl = this.readConfig('updateUrl');

        let manifestPath = path.join(inputPath, 'manifest.json');
        let zipFile = path.join(outputPath, `${name}.zip`);
        let crxFile = path.join(outputPath, `${name}.crx`);
        let xmlFile = path.join(outputPath, 'update.xml');

        this.log('creating chrome app...', { verbose: true });

        this.distFiles = [];

        return this._ensureOutputPath(distDir, outputPath)
          .then(this._loadPrivateKey.bind(this, root, keyPath))
          .then(this._createExtension.bind(this, root, inputPath, codebase))
          .then(this._createSelfDistributedApp.bind(this, typeof codebase !== 'undefined', root, distDir, crxFile, xmlFile, manifestPath, updateUrl))
          .then(this._createWebstoreDistributedApp.bind(this, typeof extensionId !== 'undefined', distDir, zipFile))
          .then(() => {
            this.log('packaged chrome app succesfully', { verbose: true });

            return { distFiles: this.distFiles };
          });
      },

      upload() {
        let outputPath = this.readConfig('outputPath');
        let name = this.readConfig('name');
        let distDir = this.readConfig('distDir');
        let zipFile = path.join(outputPath, `${name}.zip`);
        let extensionId = this.readConfig('extensionId');
        let publishTarget = this.readConfig('publishTarget');
        let clientId = this.readConfig('clientId');
        let clientSecret = this.readConfig('clientSecret');
        let refreshToken = this.readConfig('refreshToken');

        if (typeof extensionId !== 'undefined' && typeof clientId !== 'undefined') {
          this.log('uploading to chrome web store...', { verbose: true });

          return this._createWebstoreClient(extensionId, clientId, clientSecret, refreshToken)
            .then(this._uploadToChromeWebStore.bind(this, distDir, zipFile))
            .then((resourceItem) => {
              let { itemError } = resourceItem;

              if (itemError) {
                let [{ error_detail }] = itemError;

                return Promise.reject(`uploading to chrome web store failed: ${error_detail}`);
              } else {
                this.log('uploaded to chrome web store succesfully', { verbose: true });
              }
            })
            .catch((error) => {
              if (error.response) {
                error = `uploading to chrome web store failed: ${error.response.body.error}`;
              }

              return Promise.reject(error);
            });
        } else {
          return Promise.resolve();
        }
      },

      activate() {
        let extensionId = this.readConfig('extensionId');
        let publishTarget = this.readConfig('publishTarget');
        let clientId = this.readConfig('clientId');
        let clientSecret = this.readConfig('clientSecret');
        let refreshToken = this.readConfig('refreshToken');

        if (typeof extensionId !== 'undefined' && typeof clientId !== 'undefined') {
          this.log('publishing to chrome web store...', { verbose: true });

          return this._createWebstoreClient(extensionId, clientId, clientSecret, refreshToken)
            .then(this._publishToChromeWebStore.bind(this, publishTarget))
            .then(() => {
              this.log('published to chrome web store succesfully', { verbose: true });
            })
            .catch((error) => {
              if (error.response) {
                error = `publishing to chrome web store failed: ${error.response.body.error}`;
              }

              return Promise.reject(error);
            });
        } else {
          return Promise.resolve();
        }
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

      _readManifest(root, manifestPath) {
        return new Promise((resolve, reject) => {
          fs.readFile(path.join(root, manifestPath), (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(JSON.parse(data));
            }
          })
        });
      },

      _writeManifest(root, manifestPath, manifest) {
        return new Promise((resolve, reject) => {
          fs.writeFile(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
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

        return Promise.resolve();
      },

      _loadExtension() {
        return this.crx.load()
          .then(this.crx.loadContents.bind(this.crx));
      },

      _createZipFile(distDir, zipFile, archiveBuffer) {
        return new Promise((resolve, reject) => {
          fs.writeFile(path.join(distDir, zipFile), archiveBuffer, (err) => {
            if (err) {
              reject(err);
            } else {
              this.log(`✔ ${zipFile}`, { verbose: true });

              resolve(archiveBuffer);
            }
          });
        });
      },

      _packageExtension(archiveBuffer) {
        return this.crx.pack(archiveBuffer);
      },

      _createCrxFile(distDir, crxFile, crxBuffer) {
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
      },

      _createUpdateXmlFile(distDir, xmlFile) {
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
      },

      _createSelfDistributedApp(create, root, distDir, crxFile, xmlFile, manifestPath, updateUrl) {
        if (create) {
          return this._readManifest(root, manifestPath).then((manifest) => {
            let distributedManifest = Object.assign({}, manifest);

            if (updateUrl) {
              distributedManifest.update_url = updateUrl;
            }

            return this._writeManifest(root, manifestPath, distributedManifest)
              .then(this._loadExtension.bind(this))
              .then(this._packageExtension.bind(this))
              .then(this._createCrxFile.bind(this, distDir, crxFile))
              .then(this._createUpdateXmlFile.bind(this, distDir, xmlFile))
              .then(this._writeManifest.bind(this, root, manifestPath, manifest));
          });
        } else {
          return Promise.resolve();
        }
      },

      _createWebstoreDistributedApp(create, distDir, zipFile) {
        if (create) {
          return this._loadExtension()
            .then(this._createZipFile.bind(this, distDir, zipFile))
            .then(this._packageExtension.bind(this));
        } else {
          return Promise.resolve();
        }
      },

      _createWebstoreClient(extensionId, clientId, clientSecret, refreshToken) {
        return Promise.resolve(webStore({
          extensionId,
          clientId,
          clientSecret,
          refreshToken
        }));
      },

      _uploadToChromeWebStore(distDir, zipFile, webStore) {
        let zip = fs.createReadStream(path.join(distDir, zipFile));
        return webStore.uploadExisting(zip);
      },

      _publishToChromeWebStore(publishTarget, webStore) {
        return webStore.publish(publishTarget);
      }
    });

    return new DeployPlugin();
  }
};
