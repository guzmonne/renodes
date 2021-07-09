import React from "react"

export function LiveReload() {
  if (process.env.NODE_ENV !== "development") return null;

  React.useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/socket");
    ws.onmessage = message => {
      const event = JSON.parse(message.data);
      if (event.type === "LOG") {
        console.log(event.message);
      }
      if (event.type === "RELOAD") {
        console.log("💿 Reloading window ...");
        window.location.reload();
      }
    };
    ws.onerror = error => {
      console.log("Remix dev asset server web socket error:");
      console.error(error);
    };
  }, [])

  return null
}