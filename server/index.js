const path = require("path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const ash = require("express-async-handler")
const bodyParser = require("body-parser")
const { createRequestHandler } = require("@remix-run/express");

const { repository } = require("./repositories/tasks")
const { model, collection } = require("./middleware/hatoas");
const { Task } = require("./models/task");

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

let app = express();
app.use(compression());
app.use(morgan("tiny"));

// You may want to be more aggressive with this caching
app.use(express.static("public", { maxAge: "1h" }));

// Remix fingerprints its assets so we can cache forever
app.use(express.static("public/build", { immutable: true, maxAge: "1y" }));

// parse application/json
app.use(bodyParser.json())

/**
 * API
 */

// API Root
app.get("/api", (_, res) => {
  res.status(200).json({
    _links: {
      tasks: {href: "/api/tasks", rel: "tasks", types: "GET|POST|PUT|DELETE"}
    }
  })
})

// Set resource and rel
app.use("/api/tasks", (req, _, next) => {
  req.resource = "tasks"
  req.rel = "task"
  next()
})

// Query tasks
app.get("/api/tasks", ash(async (req, _, next) => {
  const {branch} = req.query
  const items = await repository.query({branch})
  if (items === undefined) {
    const error = new Error(`can't find tasks for ${branch ? `branch ${branch}` : "root branch"}`)
    error.statusCode = 404
    next(error)
  }
  req.rel = "tasks"
  req.json = {items: items.map(Task.toJSON)}
  next()
}))

// Create task
app.post("/api/tasks", ash(async (req, res, next) => {
  try {
    const task = new Task(req.body)
    await repository.put(task)
    res.status(201).send()
  } catch (err) {
    if (err === "ConditionalCheckFailedException") {
      const error = new Error(`task with id ${req.body.id} already exists`)
      error.statusCode = 422
      next(error)
      return
    }
    throw err
  }
}))

// Read task
app.get("/api/tasks/:id", ash(async (req, _, next) => {
  const {id} = req.params
  const item = await repository.get(id)
  if (item === undefined) {
    const error = new Error(`can't find task with id ${id}`)
    error.statusCode = 404
    next(error)
  }
  req.json = {item: Task.toJSON(item)}
  next()
}))

// Update task
app.put("/api/tasks/:id", ash(async (req, res) => {
  const {id} = req.params
  const task = repository.get(id)
  await repository.update(task.set(req.body))
  res.status(202).send()
}))

// Delete a task
app.delete("/api/tasks/:id", ash(async (req, res) => {
  const {id} = req.params
  await repository.delete(id)
  res.status(204).send()
}))

// Drag a task
app.post("/api/tasks/:id", ash(async (req, res) => {
  const {id} = req.params
  const {branch, after} = req.query
  await repository.after(id, branch, after)
  res.status(204).send()
}))

// HATOAS
app.use((req, res, next) => {
  if (req.json) {
    if (req.json.item)  model(req)
    if (req.json.items) collection(req)
    res.status(200).json(req.json)
    return
  }
  next()
})

/**
 * REMIX
 */
app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require("./build") })
    : (req, res, next) => {
        purgeRequireCache();
        let build = require("./build");
        return createRequestHandler({ build, mode: MODE })(req, res, next);
      }
);

let port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

/**
 * Error handler
 */

// Page not found error handler
app.use((_, __, next) => {
  let err = new Error("Page Not Found")
  err.statusCode = 404
  next(err)
})

// Default error handler
app.use((err, _, res, __) => {
  // Log message to the server console
  console.log(err)
  // If err has no specified error code, use a 500 error code
  if (err.statusCode) {
    res.status(err.statusCode).json({error: err.toString()})
    return
  }
  // Send HTTP response
  res.status(500).json({error: err.toString()})
})

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
