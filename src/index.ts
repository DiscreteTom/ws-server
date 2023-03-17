#!/usr/bin/env node
import yargs from "yargs/yargs";
import { WebSocketServer, WebSocket } from "ws";
import * as readline from "readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function questionAsync(ws: WebSocket) {
  const answer = await rl.question(">>>");
  console.log(`<= ${answer}`);
  ws.send(answer);
  questionAsync(ws);
}

const argv = yargs(process.argv.slice(2))
  .options({
    p: { type: "number", alias: "port", default: 8080 },
    h: {
      type: "boolean",
      alias: "header",
      default: false,
      description: "Show header",
    },
  })
  .parseSync();

const wss = new WebSocketServer({ port: argv.p });
console.log(`Server: ws://localhost:${argv.p}`);

wss.on("connection", function connection(ws, req) {
  if (argv.h) {
    console.log(req.headers);
  }

  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log(`=> ${data}`);
  });

  questionAsync(ws);
});
