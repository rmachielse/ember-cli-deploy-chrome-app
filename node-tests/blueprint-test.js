'use strict';

const fs = require('fs-extra');
const path = require('path');
const { setupTestHooks, emberNew, emberGenerate } = require('ember-cli-blueprint-test-helpers/helpers');
const { expect, file, dir } = require('ember-cli-blueprint-test-helpers/chai');

describe('ember-cli-deploy-chrome-app blueprint', function() {
  setupTestHooks(this);

  it('generates', function() {
    return emberNew().then(() => {

      fs.mkdirpSync(path.join(process.cwd(), 'tmp/deploy-dist/assets'));
      fs.copySync(path.join(process.cwd(), 'app/index.html'), path.join(process.cwd(), 'tmp/deploy-dist/index.html'));

      return emberGenerate(['ember-cli-deploy-chrome-app']).then(() => {

        expect(file('chrome/background.js')).to.exist;
        expect(file('chrome/background.js')).to.not.be.empty;
        expect(file('chrome/manifest.json')).to.exist;
        expect(file('chrome/manifest.json')).to.not.be.empty;

        expect(dir('chrome/assets')).to.exist;
        expect(dir('chrome/assets')).to.be.empty;
        expect(file('chrome/window.html')).to.exist;
        expect(file('chrome/window.html')).to.not.be.empty;
        expect(file('chrome/window.html')).to.equal(file('tmp/deploy-dist/index.html'));

        expect(file('key.pem')).to.exist;
        expect(file('key.pem')).to.not.be.empty;
      });
    });
  });
});
