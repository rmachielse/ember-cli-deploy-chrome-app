import Ember from 'ember';
import config from './config/environment';

const { Router } = Ember;

let router = Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

router.map(function() {
});

export default router;
