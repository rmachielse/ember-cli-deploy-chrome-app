import Ember from 'ember';
import config from './config/environment';

const { Router } = Ember;

let router = Router.extend({
  location: config.locationType
});

router.map(function() {
});

export default router;
