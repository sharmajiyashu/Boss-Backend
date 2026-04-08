import { Router } from 'express';
import auth from './auth';
import home from './home';
import product from './product';
import subcategory from './subcategory';
import user from './user';


export default (router: Router): Router => {
  auth(router);
  home(router);
  product(router);
  subcategory(router);
  user(router);
  return router;
};
