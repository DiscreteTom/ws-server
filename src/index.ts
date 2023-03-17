#!/usr/bin/env node
import yargs from "yargs/yargs";
import { WebSocketServer, WebSocket } from "ws";
import * as readline from "readline";
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
    nt: {
      type: "boolean",
      alias: "no-trim",
      default: false,
      description: "Don't trim message",
    },
    e: {
      type: "boolean",
      alias: "allow-empty",
      default: false,
      description: "Allow empty message",
    },
  })
  .parseSync();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});
rl.prompt(true);

function print(msg: string) {
  process.stdout.write("\r\u001b[2K\u001b[3D"); // clear line
  process.stdout.write(msg + "\n");
  rl.prompt(true);
}

rl.on("line", async (answer) => {
  if (answer.startsWith("@all ") || !answer.match(/^@\d+ /)) {
    // broadcast to all clients
    const raw = answer.startsWith("@all ") ? answer.slice(5) : answer;
    const content = argv.nt ? raw : raw.trim();
    if (content.length > 0 || argv.e) {
      await Promise.all(
        [...clients].map(([id, ws]) => {
          new Promise<void>((resolve) => {
            ws.send(content, (err) => {
              if (err) {
                print(chalk.red(`\r@${id}: ${err.message}`));
                clients.delete(id);
              }
              resolve();
            });
          });
        })
      );
      print(chalk.blue(`\r@all < ${content}`));
    }
  } else {
    const id = answer.match(/^@(\d+) /)![1];
    const raw = answer.slice(id.length + 2); // +2 for @ and space
    const content = argv.nt ? raw : raw.trim();
    if (content.length > 0 || argv.e) {
      const ws = clients.get(Number(id));
      if (ws) {
        await new Promise<void>((resolve) => {
          ws.send(content, (err) => {
            if (err) {
              print(chalk.red(`\r@${id}: ${err.message}`));
              clients.delete(Number(id));
            } else print(chalk.blue(`\r@${id} < ${content}`));
            resolve();
          });
        });
      }
    }
  }
});

const wss = new WebSocketServer({ port: argv.p });
print(`Server: ws://localhost:${argv.p}  press CTRL+C to quit`);

wss.on("connection", function connection(ws, req) {
  const currentClientId = clientId;
  clients.set(currentClientId, ws);

  print(chalk.green(`\rClient @${currentClientId} connected`));
  if (argv.h) print(`\rHeaders @${currentClientId}: ${req.headers}`);

  ws.on("error", (err) => {
    print(chalk.red(`\r@${currentClientId}: ${err.message}`));
    clients.delete(currentClientId);
  });

  ws.on("message", (data) =>
    print(chalk.green(`\r@${currentClientId} > ${data}`))
  );

  ws.on("close", () => {
    print(chalk.green(`\rClient @${currentClientId} disconnected`));
    clients.delete(currentClientId);
  });

  clientId++;
});
wss.on("error", (err) => print(chalk.red(`\rServer: ${err.message}`)));
