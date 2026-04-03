import { Router } from 'express';
import auth from './auth';
import home from './home';
import product from './product';
import subcategory from './subcategory';


export default (router: Router): Router => {
  auth(router);
  home(router);
  product(router);
  subcategory(router);
  return router;
};
