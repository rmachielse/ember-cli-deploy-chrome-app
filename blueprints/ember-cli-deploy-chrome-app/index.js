/* eslint-env node */

const { Promise } = require('rsvp');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
  normalizeEntityName() {},

  locals({ project: { pkg: { name: packageName, description: packageDescription, version: packageVersion } } }) {
    return {
      capitalizedPackageName: packageName.slice(0, 1).toUpperCase() + packageName.slice(1),
      packageName,
      packageDescription,
      packageVersion
    };
  },

  afterInstall(options) {
    return Promise.all([
      this._symlinkAssets(options),
      this._symlinkWindow(options),
      this._generateKey(options)
    ]);
  },

  _symlinkAssets({ project: { root } }) {
    return new Promise((resolve) => {
      fs.symlink('../tmp/deploy-dist/assets', `${root}/chrome/assets`, 'dir', resolve);
    });
  },

  _symlinkWindow({ project: { root } }) {
    return new Promise((resolve) => {
      fs.symlink('../tmp/deploy-dist/index.html', `${root}/chrome/window.html`, resolve);
    });
  },

  _generateKey({ project: { root } }) {
    let crx = path.join(__dirname, '..', '..', '..', 'crx', 'bin', 'crx.js');

    return new Promise((resolve) => {
      exec(`${crx} keygen ${root}`, resolve);
    });
  }
};
