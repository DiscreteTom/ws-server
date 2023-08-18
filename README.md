# ws-server

[![npm](https://img.shields.io/npm/v/@discretetom/ws-server?style=flat-square)](https://www.npmjs.com/package/@discretetom/ws-server)
![NPM](https://img.shields.io/npm/l/@discretetom/ws-server?style=flat-square)

A CLI tool to start a WebSocket debug server using NodeJS.

This is useful when you want to mock a WebSocket server to test your WebSocket client.

## Installation

```bash
npm install -g @discretetom/ws-server
```

## Usage

```bash
# ws-server --help
Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -p, --port                                            [number] [default: 8080]
  -h, --header       Show header                      [boolean] [default: false]
  -T, --no-trim      Don't trim message               [boolean] [default: false]
  -e, --allow-empty  Allow empty message              [boolean] [default: false]
  -E, --echo         Print message from the server    [boolean] [default: false]
```

## Commands

```bash
# send message to all clients
@all <message>
# you can omit @all
<message>

# send message to a specific client
@<id> <message>

# disconnect a client
!<id>
```

## [CHANGELOG](https://github.com/DiscreteTom/ws-server/blob/main/CHANGELOG.md)
