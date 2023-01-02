module.exports = function () {
  const api = {};

  const webchatClientSecret = process.env.WEBCHAT_CLIENT_SECRET;

  api.validateClientSecret = function (clientSecret) {
    return webchatClientSecret === clientSecret;
  };
  api.authorizeApi = function (req, res, next) {
    let clientSecret = req.headers ? req.headers["x-client-secret"] : null;
    if (!clientSecret) clientSecret = req.query.clientSecret;

    if (!clientSecret) {
      res.status(403);
      res.send("Access denied");
    } else {
      // test access_token against allowed tokens
      if (api.validateClientSecret(clientSecret)) {
        next();
      } else {
        res.status(403);
        res.send("Invalid access token");
      }
    }
  };

  return api;
};
