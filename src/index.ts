#!/usr/bin/env node
import yargs from "yargs/yargs";
import { WebSocketServer, WebSocket } from "ws";
import * as readline from "readline/promises";
import chalk from "chalk";

let clientId = 1;
const clients = new Map<number, WebSocket>();

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
  clients.set(currentClientId, ws);

  console.log(chalk.green(`\rClient @${currentClientId} connected`));
  if (argv.h) console.log(`\rHeaders @${currentClientId}: ${req.headers}`);

  ws.on("error", (err) => {
    console.error(chalk.red(`\r@${currentClientId}: ${err.message}`));
    clients.delete(currentClientId);
  });

  ws.on("message", (data) =>
    console.log(chalk.green(`\r@${currentClientId} > ${data}`))
  );

  ws.on("close", () => {
    console.log(chalk.green(`\rClient @${currentClientId} disconnected`));
    clients.delete(currentClientId);
  });

  clientId++;
});
wss.on("error", (err) => console.error(chalk.red(`\rServer: ${err.message}`)));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function questionAsync() {
  const answer = await rl.question("> ");

  if (answer.startsWith("@all ") || !answer.match(/^@\d+ /)) {
    // broadcast to all clients
    const content = answer.startsWith("@all ") ? answer.slice(5) : answer;
    await Promise.all(
      [...clients].map(([id, ws]) => {
        new Promise<void>((resolve) => {
          ws.send(content, (err) => {
            if (err) {
              console.error(chalk.red(`\r@${id}: ${err.message}`));
              clients.delete(id);
            }
            resolve();
          });
        });
      })
    );
    console.log(chalk.blue(`\r@all < ${content}`));
  } else {
    const id = answer.match(/^@(\d+) /)![1];
    const content = answer.slice(id.length + 2); // +2 for @ and space
    const ws = clients.get(Number(id));
    if (ws) {
      await new Promise<void>((resolve) => {
        ws.send(content, (err) => {
          if (err) {
            console.error(chalk.red(`\r@${id}: ${err.message}`));
            clients.delete(Number(id));
          } else console.log(chalk.blue(`\r@${id} < ${content}`));
          resolve();
        });
      });
    }
  }

  questionAsync();
}

questionAsync();
