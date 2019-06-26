'use strict';

const path = require('path');
const fs = require('fs-extra');
const chai = require('chai');
const nock = require('nock');
const RSVP = require('rsvp');
const chaiAsPromised = require("chai-as-promised");
const chaiFiles = require('chai-files');
const { execSync } = require('child_process');
const rimraf  = RSVP.denodeify(require('rimraf'));
const crx = require.resolve('crx/bin/crx.js');
const { expect } = chai;
const { file } = chaiFiles;

chai.use(chaiAsPromised);
chai.use(chaiFiles);
nock.disableNetConnect();

describe('ember-cli-deploy-chrome-app plugin', function() {
  var subject;

  beforeEach(function() {
    subject = require('../index');
  });

  it('has a name', function() {
    var result = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    expect(result.name).to.equal('test-plugin');
  });

  it('implements the correct hooks', function() {
    var result = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    expect(typeof result.didBuild).to.equal('function');
    expect(typeof result.upload).to.equal('function');
    expect(typeof result.activate).to.equal('function');
  });

  var plugin, ui, config, project, root, distDir, context;

  beforeEach(function() {
    plugin = subject.createDeployPlugin({
      name: 'chrome-app'
    });
    root = path.join(process.cwd(), 'tmp');
    config = {};
    project = {
      root,
      pkg: {
        name: 'test'
      }
    };
    distDir = 'tmp';
    ui = {};
  });

  describe('configure hook', function() {
    beforeEach(function() {
      context = {
        distDir,
        project,
        config: {
          'chrome-app': config
        },
        ui
      };

      plugin.beforeHook(context);
      plugin.configure(context);
    });

    it('adds default config to the config object', function() {
      expect(config.inputPath).not.to.be.empty;
      expect(config.inputPath).to.be.a('string');
      expect(config.inputPath).to.equal('chrome');
      expect(config.outputPath).not.to.be.empty;
      expect(config.outputPath).to.be.a('string');
      expect(config.outputPath).to.equal('chrome');

      expect(config.keyPath).not.to.be.empty;
      expect(config.keyPath).to.be.a('string');
      expect(config.keyPath).to.equal('key.pem');

      expect(config.publishTarget).not.to.be.empty;
      expect(config.publishTarget).to.be.a('string');
      expect(config.publishTarget).to.equal('default');

      expect(config.root).not.to.be.empty;
      expect(config.root).to.be.a('function');
      expect(config.root(context)).to.equal(root);

      expect(config.name).not.to.be.empty;
      expect(config.name).to.be.a('function');
      expect(config.name(context)).to.equal('test');

      expect(config.distDir).not.to.be.empty;
      expect(config.distDir).to.be.a('function');
      expect(config.distDir(context)).to.equal(distDir);
    });
  });

  describe('didBuild hook', function() {
    this.timeout(30000);

    describe('with a codebase', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {
            codebase: '/chrome/text.crx'
          }
        };

        context = {
          distDir,
          project,
          config,
          ui
        };

        fs.mkdirpSync('tmp/chrome');
        fs.writeFileSync('tmp/chrome/manifest.json', '{"update_url":"/chrome/test.xml"}');
        execSync(`${crx} keygen ${root}`);

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      afterEach(function() {
        return rimraf(distDir);
      });

      it('creates a crx and xml file', function() {
        return expect(plugin.didBuild(context).then(({ distFiles }) => {
          expect(distFiles).to.contain('chrome/test.crx');
          expect(distFiles).to.contain('chrome/update.xml');

          expect(file('tmp/chrome/test.crx')).to.exist;
          expect(file('tmp/chrome/test.crx')).not.to.be.empty;

          expect(file('tmp/chrome/update.xml')).to.exist;
          expect(file('tmp/chrome/update.xml')).not.to.be.empty;
        })).to.be.fulfilled;
      });
    });

    describe('with an extensionId', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {
            extensionId: 'fakeExtensionId'
          }
        };

        context = {
          distDir,
          project,
          config,
          ui
        };

        fs.mkdirpSync('tmp/chrome');
        fs.writeFileSync('tmp/chrome/manifest.json', '{}');
        execSync(`${crx} keygen ${root}`);

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      afterEach(function() {
        return rimraf(distDir);
      });

      it('creates a zip file', function() {
        return expect(plugin.didBuild(context).then(({ distFiles }) => {
          expect(distFiles).to.be.empty;
          expect(file('tmp/chrome/test.zip')).to.exist;
          expect(file('tmp/chrome/test.zip')).not.to.be.empty;
        })).to.be.fulfilled;
      });
    });

    describe('with a codebase and an extensionId', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {
            codebase: '/chrome/text.crx',
            extensionId: 'fakeExtensionId'
          }
        };

        context = {
          distDir,
          project,
          config,
          ui
        };

        fs.mkdirpSync('tmp/chrome');
        fs.writeFileSync('tmp/chrome/manifest.json', '{"update_url":"/chrome/test.xml"}');
        execSync(`${crx} keygen ${root}`);

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      afterEach(function() {
        return rimraf(distDir);
      });

      it('creates a zip, crx and xml file', function() {
        return expect(plugin.didBuild(context).then(({ distFiles }) => {
          expect(distFiles).not.to.contain('chrome/test.zip');
          expect(distFiles).to.contain('chrome/test.crx');
          expect(distFiles).to.contain('chrome/update.xml');

          expect(file('tmp/chrome/test.zip')).to.exist;
          expect(file('tmp/chrome/test.zip')).not.to.be.empty;

          expect(file('tmp/chrome/test.crx')).to.exist;
          expect(file('tmp/chrome/test.crx')).not.to.be.empty;

          expect(file('tmp/chrome/update.xml')).to.exist;
          expect(file('tmp/chrome/update.xml')).not.to.be.empty;
        })).to.be.fulfilled;
      });
    });
  });

  describe('upload hook', function() {
    describe('without extensionId and client credentials', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {}
        };

        context = {
          project,
          config,
          ui
        };

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      it('does not upload anything', function() {
        return expect(plugin.upload(context)).to.be.fulfilled;
      });
    });

    describe('with extensionId and client credentials', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {
            extensionId: 'fakeExtensionId',
            clientId: 'fakeClientId',
            clientSecret: 'fakeClientSecret',
            refreshToken: 'fakeRefreshToken'
          }
        };

        context = {
          distDir,
          project,
          config,
          ui
        };

        fs.mkdirpSync('tmp/chrome');
        fs.writeFileSync('tmp/chrome/test.zip', '');

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      afterEach(function() {
        return rimraf(distDir);
      });

      describe('when the request fails', function() {
        beforeEach(function() {
          nock('https://www.googleapis.com')
            .post('/oauth2/v4/token')
            .reply(200, {
              access_token: 'fakeAccessToken'
            });

          nock('https://www.googleapis.com')
            .put('/upload/chromewebstore/v1.1/items/fakeExtensionId')
            .reply(200, { itemError: [{ error_detail: '' }] });
        });

        it('fails to upload the zip file to the chrome webstore', function() {
          return expect(plugin.upload(context)).to.be.rejected;
        });
      });

      describe('when the request succeeds', function() {
        beforeEach(function() {
          nock('https://www.googleapis.com')
            .post('/oauth2/v4/token')
            .reply(200, {
              access_token: 'fakeAccessToken'
            });

          nock('https://www.googleapis.com')
            .put('/upload/chromewebstore/v1.1/items/fakeExtensionId')
            .reply(200);
        });

        it('uploads the zip file to the chrome webstore', function() {
          return expect(plugin.upload(context)).to.be.fulfilled;
        });
      });
    });
  });

  describe('activate hook', function() {
    describe('without extensionId and client credentials', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {}
        };

        context = {
          config,
          ui
        };

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      it('does not publish anything', function() {
        return expect(plugin.activate(context)).to.be.fulfilled;
      });
    });

    describe('with extensionId and client credentials', function() {
      beforeEach(function() {
        config = {
          'chrome-app': {
            extensionId: 'fakeExtensionId',
            clientId: 'fakeClientId',
            clientSecret: 'fakeClientSecret',
            refreshToken: 'fakeRefreshToken'
          }
        };

        context = {
          config,
          ui
        };

        plugin.beforeHook(context);
        plugin.configure(context);
      });

      describe('when the request fails', function() {
        beforeEach(function() {
          nock('https://www.googleapis.com')
            .post('/oauth2/v4/token')
            .reply(401);
        });

        it('fails to publish to the chrome webstore', function() {
          return expect(plugin.activate(context)).to.be.rejected;
        });
      });

      describe('when the request succeeds', function() {
        beforeEach(function() {
          nock('https://www.googleapis.com')
            .post('/oauth2/v4/token')
            .reply(200, {
              access_token: 'fakeAccessToken'
            });

          nock('https://www.googleapis.com')
            .post('/chromewebstore/v1.1/items/fakeExtensionId/publish')
            .query({ publishTarget: 'default' })
            .reply(200, {});
        });

        it('publishes to the chrome webstore', function() {
          return expect(plugin.activate(context)).to.be.fulfilled;
        });
      });
    });
  });
});
