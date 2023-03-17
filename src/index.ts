#!/usr/bin/env node
import yargs from "yargs/yargs";
import { WebSocketServer, WebSocket } from "ws";
import * as readline from "readline/promises";
import chalk from "chalk";

let clientId = 1;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function questionAsync(ws: WebSocket, currentClientId: number) {
  const answer = await rl.question(">");
  ws.send(answer, (err) => {
    if (err) console.error(chalk.red(err.message));
    else console.log(chalk.blue(`@${currentClientId}< ${answer}`));
  });
  questionAsync(ws, currentClientId);
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
console.log(`Server: ws://localhost:${argv.p}  press CTRL+C to quit`);

wss.on("connection", function connection(ws, req) {
  const currentClientId = clientId;

  console.log(chalk.green(`Client @${currentClientId} connected`));
  if (argv.h) console.log(`Headers @${currentClientId}: ${req.headers}`);

  ws.on("error", (err) =>
    console.error(chalk.red(`@${currentClientId}: ${err.message}`))
  );

  ws.on("message", (data) =>
    console.log(chalk.green(`@${currentClientId}> ${data}`))
  );

  ws.on("close", () =>
    console.log(chalk.green(`Client @${currentClientId} disconnected`))
  );

  questionAsync(ws, currentClientId);

  clientId++;
});
