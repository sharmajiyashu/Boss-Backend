import { Router } from 'express';
import auth from './auth';
import home from './home';
import product from './product';
import subcategory from './subcategory';
import user from './user';
import userAction from './userAction';
import subscription from './subscription';
import chat from './chat';


export default (router: Router): Router => {
  auth(router);
  home(router);
  product(router);
  subcategory(router);
  user(router);
  userAction(router);
  subscription(router);
  chat(router);
  return router;
};
