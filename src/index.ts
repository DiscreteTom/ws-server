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
    T: {
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
    E: {
      type: "boolean",
      alias: "echo",
      default: false,
      description: "Print message from the server",
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

const help = `# show this help
/help
# exit
/exit
# exit
/quit

# send message to all clients
@all <message>
# you can omit @all
<message>

# send message to a specific client
@<id> <message>

# disconnect a client
!<id>`;

rl.on("line", async (answer) => {
  if (answer === "/help") {
    print(
      help
        .split("\n")
        .map((s) => {
          if (s.startsWith("#")) return chalk.gray(s);
          return s.replaceAll(/<(.+?)>/g, (_, msg) => chalk.yellow(`<${msg}>`));
        })
        .join("\n")
    );
  } else if (answer === "/exit" || answer === "/quit") {
    process.exit(0);
  } else if (answer.match(/^!\d+$/)) {
    // disconnect client
    const id = Number(answer.slice(1));
    const ws = clients.get(id);
    if (ws) {
      await new Promise<void>((resolve) => {
        ws.close();
        ws.on("close", () => resolve());
      });
    } else {
      print(chalk.red(`Client @${id} not found`));
    }
  } else if (answer.startsWith("@all ") || !answer.match(/^@\d+ /)) {
    // broadcast to all clients
    const raw = answer.startsWith("@all ") ? answer.slice(5) : answer;
    const content = argv.T ? raw : raw.trim();
    if (content.length > 0 || argv.e) {
      if (clients.size > 0) {
        await Promise.all(
          [...clients].map(([id, ws]) => {
            new Promise<void>((resolve) => {
              ws.send(content, (err) => {
                if (err) {
                  print(chalk.red(`@${id}: ${err.message}`));
                  clients.delete(id);
                }
                resolve();
              });
            });
          })
        );
        if (argv.E) print(chalk.blue(`@all < ${content}`)); // echo
        else rl.prompt(true);
      } else {
        print(chalk.red("No client connected"));
      }
    } else {
      print(chalk.gray("Empty message, ignored."));
    }
  } else {
    // send to specific client
    const id = answer.match(/^@(\d+) /)![1];
    const raw = answer.slice(id.length + 2); // +2 for @ and space
    const content = argv.T ? raw : raw.trim();
    if (content.length > 0 || argv.e) {
      const ws = clients.get(Number(id));
      if (ws) {
        await new Promise<void>((resolve) => {
          ws.send(content, (err) => {
            if (err) {
              print(chalk.red(`@${id}: ${err.message}`));
              clients.delete(Number(id));
            } else if (argv.E) print(chalk.blue(`@${id} < ${content}`)); // echo
            else rl.prompt(true);
            resolve();
          });
        });
      } else {
        print(chalk.red(`Client @${id} not found`));
      }
    } else {
      print(chalk.gray("Empty message, ignored."));
    }
  }
});

const wss = new WebSocketServer({ port: argv.p });
print(`Server: ws://localhost:${argv.p}  press CTRL+C to quit`);

wss.on("connection", function connection(ws, req) {
  const currentClientId = clientId;
  clients.set(currentClientId, ws);

  print(chalk.green(`Client @${currentClientId} connected`));
  if (argv.h)
    print(
      `Headers @${currentClientId}: ${JSON.stringify(req.headers, null, 2)}`
    );

  ws.on("error", (err) => {
    print(chalk.red(`@${currentClientId}: ${err.message}`));
    clients.delete(currentClientId);
  });

  ws.on("message", (data) =>
    print(chalk.green(`@${currentClientId} > ${data}`))
  );

  ws.on("close", () => {
    print(chalk.green(`Client @${currentClientId} disconnected`));
    clients.delete(currentClientId);
  });

  clientId++;
});
wss.on("error", (err) => print(chalk.red(`Server: ${err.message}`)));
