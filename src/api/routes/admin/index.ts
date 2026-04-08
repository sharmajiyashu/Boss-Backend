import { Router } from 'express';

import auth from './auth';
import category from './category';
import subcategory from './subcategory';
import user from './user';
import product from './product';
import setting from './setting';


export default (router: Router): Router => {
    auth(router);
    category(router);
    subcategory(router);
    user(router);
    product(router);
    setting(router);
    return router;
};