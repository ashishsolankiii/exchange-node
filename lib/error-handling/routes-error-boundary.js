import authMiddleware from "../../middlewares/authMiddleware.js";
import jwtMiddleware from "../../middlewares/jwtMiddleware.js";

/**
 * Wraps the given function with a try-catch block and returns the wrapped function.
 *
 * @param {Function} callback - The function to be wrapped with try-catch.
 * @returns {Function} - The wrapped function that handles errors using try-catch.
 */
const functionTryCatchWrapper = (callback) => {
  return async function wrappedCallback(req, res, next) {
    try {
      return await callback(req, res, next);
    } catch (e) {
      if (e?.statusCode) {
        return res.status(e.statusCode).json({ message: e.message, ...e.responseBody });
      }
      return res.status(500).json({ message: e.message });
    }
  };
};

/**
 * Wraps an Express router to define a route
 * with optional authentication and multiple middlewares.
 *
 * @param {Express.Router} router - The Express router instance.
 * @param {string} method - The HTTP method for the route (e.g., 'get', 'post', 'put', 'delete').
 * @param {string} routePath - The path for the route.
 * @param {Function|Array<Function>} callbacks - The callback function(s) or an array of callback functions to be executed for the route.
 * @param {boolean} [checkAuth=true] - Optional. Specifies whether to check authentication for the route. Defaults to `true`.
 * @returns {void}
 */
export const route = (router, method, routePath, callbacks, checkAuth = true) => {
  const fnCallbacks = Array.isArray(callbacks)
    ? callbacks.map((cb) => functionTryCatchWrapper(cb))
    : functionTryCatchWrapper(callbacks);

  if (checkAuth) {
    router[method](routePath, [jwtMiddleware, fnCallbacks]);
  } else {
    router[method](routePath, fnCallbacks);
  }
};
