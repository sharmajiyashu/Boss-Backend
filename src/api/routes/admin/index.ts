import { Router } from 'express';

import auth from './auth';
import category from './category';
import subcategory from './subcategory';
import user from './user';
import product from './product';
import setting from './setting';
import cms from './cms';
import dashboard from './dashboard';
import state from './state';
import city from './city';
import country from './country';
import call from './call';
import notification from './notification';
import faq from './faq';


export default (router: Router): Router => {
    auth(router);
    category(router);
    subcategory(router);
    user(router);
    product(router);
    setting(router);
    cms(router);
    dashboard(router);
    state(router);
    city(router);
    country(router);
    call(router);
    notification(router);
    faq(router);
    return router;
};