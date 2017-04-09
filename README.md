# Ember CLI Deploy Chrome app
[![Build Status](https://travis-ci.org/rmachielse/ember-cli-deploy-chrome-app.svg?branch=master)](https://travis-ci.org/rmachielse/ember-cli-deploy-chrome-app)
[![Ember Observer Score](http://emberobserver.com/badges/ember-cli-deploy-chrome-app.svg)](http://emberobserver.com/addons/ember-cli-deploy-chrome-app)
[![](https://ember-cli-deploy.github.io/ember-cli-deploy-version-badges/plugins/ember-cli-deploy-chrome-app.svg)](http://ember-cli-deploy.github.io/ember-cli-deploy-version-badges/)

This Ember CLI deploy plugin provides a way to build and deploy an Ember app as a Chrome app.

## Installation

Install the plugin by running:

```
ember install ember-cli-deploy-chrome-app
```

This will generate a `chrome` folder and a `key.pem` file in the root of your project.
In `chrome` you'll find `background.js` and a default `manifest.json` that you can change according to your needs. For more information about the manifest [see this link](https://developer.chrome.com/apps/first_app).

You can add files and folders from your `tmp/deploy-dist` to the chrome app by copying or symlinking them in the `chrome` directory.
`window.html` and the `assets` folder have already been added as a default.
This way you can manage which parts of your Ember app will be added to your chrome app.

## Usage

When you run `ember deploy`, a `project_name.zip` file will be generated in the `chrome` folder of the deploy folder. You can upload this file to the Chrome Web Store to publish it.

It is also possible to automatically upload and/or publish your chrome app to the Chrome Web Store by providing the `extensionId` of your app along with a `clientId`, `clientSecret` and a `refreshToken` for your google account. More details on how to generate those can be found [here](https://developer.chrome.com/webstore/using_webstore_api#beforeyoubegin). The uploaded package will be published in ember-cli-deploy's `activate` step and is therefor optional.

During development you don't have to deploy your project all the time, you can just go to `chrome://extensions` with chrome and click 'Load unpacked extension'. Then choose the `chrome` folder and you'll see the app appear in chrome.

## Configuration

You can configure the default behavior in `config/deploy.js`:

```javascript
// config/deploy.js
module.exports = function(deployTarget) {
  return {
    'chrome-app': {
      ...
    }
  };
};
```

- `outputPath`
  By default, the plugin will generate your chrome app in the `chrome` folder of the deploy folder. This can be changed by changing the `outputPath` to the desired location.
- `inputPath`
  By default, the chrome app will be generated in the root of your project. If you would like to use a different name or location, you can change the `inputPath` variable to the desired location.
- `distDir`
  If you want the chrome app to be saved outside of the deployed folder (for example if you don't want to upload it with the normal app) you can change the `distDir` to the desired location. The final location will be `distDir/outputPath`.
- `name`
  Can be used to change the name of the generated files. Will default to the name of the package.

### Chrome Web Store distributed apps

- `extensionId`
  If you provide an extension id (the id of your app on the Chrome Web Store), the addon will generate a `project_name.zip` file that can be uploaded to the Chrome Web Store. It will not be added to `distFiles`.
- `publishTarget`
  During the `activate` step, the package will be published on the Chrome Web Store. By default it will be published to everyone, but alternatively you can set `publishTarget` to `trustedTesters` to publish the package to your test group only.
- `clientId`
  The client id that you can generate on [console.developers.google.com](https://console.developers.google.com)
- `clientSecret`
  The client secret that you can generate along with the client id.
- `refreshToken`
  The refresh token that will be used to upload and/or publish your app to the Chrome Web Store. Details on how to generate it can be found [here](https://developer.chrome.com/webstore/using_webstore_api#beforeyoubegin)

### Self-distributed apps

- `codebase`
  If you provide a codebase url, the plugin will assume that you want to create a self-distributed chrome app. It will generate a signed `project_name.crx` and a `update.xml` file. The crx file will be signed with `key.pem`.
- `keyPath`
  The location of your key, that is used to sign the extension in case of a self-distributed app.
- `updateUrl`
  If you want new versions of the app to be installed automatically, you have to provide the full url to the `update.xml` file on your webserver. By default the file will be placed at `chrome/update.xml`. See [https://developer.chrome.com/extensions/autoupdate](Autoupdating) for more information.

Instead of using `tmp/deploy-dist` you can also symlink to the `dist` directory, which makes it easier to use it in development. In that case you might need to change the `config/deploy.js` file to use `dist` as well:

```javascript
// config/deploy.js
module.exports = function(deployTarget) {
  return {
    build: {
      outputPath: 'dist'
    },
    'chrome-app': {
      ...
    }
  };
};
```

## Known limitations

- Chrome apps currently seem not to be able yet to handle HTML5 pushState. Make sure `locationType` is set to `hash` in your `config/environment.js` file.
- Depending on your configuration, you might need to disable fingerprinting. If you have symlinked `chrome/window.html` to `dist/index.html`, the asset urls in `app/index.html` will be compiled like normal. However, if you have a different window.html, it will not be compiled and thus will not be able to handle fingerprinted assets. In that case you have to disable it in `ember-cli-build.js` by setting `fingerprint` to `{ enabled: false }`.

## Credits

This package is based on the following awesome packages:

- [crx](https://github.com/oncletom/crx)
- [chrome-webstore-upload](https://github.com/DrewML/chrome-webstore-upload)

## License

This project is released under the [MIT License](LICENSE.md).
