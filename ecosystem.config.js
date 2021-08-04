module.exports = {
  apps: [{
    name: "Express",
    script: "npm run start:dev",
    watch: ["server", "client"],
    // Delay between restarts
    watch_delay: 1000,
    ignore_watch: ["node_modules", "app", "public", "server/build"]
  }, {
    name: "Remix",
    script: "npm run dev",
  }, {
    name: "DB Admin",
    script: "npm run db-admin"
  }]
}
