const path = require("path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

const app = express();
const remixHandler = MODE === "production"
  ? createRequestHandler({ build: require("./build") })
  : (req, res, next) => {
    purgeRequireCache();
    let build = require("./build");
    return createRequestHandler({ build, mode: MODE })(req, res, next);
  }

app.use(compression());
app.use(morgan("tiny"));

// You may want to be more aggressive with this caching
app.use(express.static("public", { maxAge: "1h" }));

// Remix fingerprints its assets so we can cache forever
app.use(express.static("public/build", { immutable: true, maxAge: "1y" }));

app.get("/nodes/home", remixRoute("nodes.home"))
app.get("/users/me", remixRoute("users.me"))

app.get("/:branch", remixRoute("$branch"))
app.post("/:branch", remixRoute("$branch"))
app.put("/:branch", remixRoute("$branch"))
app.delete("/:branch", remixRoute("$branch"))
app.patch("/:branch", remixRoute("$branch"))

app.get("/:branch/self", remixRoute("$branch.self"))

app.all("*", remixHandler);

let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
/**
 * remixRoute will update the value of the `Request` url so that Remix
 * can process it.
 * @param route - Remix route that should match.
 */
function remixRoute(route) {
  return function (req, _, next) {
    if (req.headers.accept === "application/json") {
      const query = new URLSearchParams(req.query)
      query.set("_data", `routes/${route}`)
      req.url = [
        "http://",
        req.headers.host,
        req.originalUrl,
        "/?",
        query.toString()
      ].join("")
    }
    next()
  }
}