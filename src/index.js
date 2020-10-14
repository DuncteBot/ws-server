import websocket from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { init as initApi, verifyToken } from './duncteApi.js';

dotenv.config();
initApi();

// sets of websocket clients
const bots = new Set();
const dashboards = new Set();

const httpServer = http.createServer();

const server = new websocket.Server({
    noServer: true,
    clientTracking: false,
});

// if message is from bot, send to dashboards
// else if message is from dashboard, send message to bots
// else do nothing and ignore

server.on('connection', (ws, req) => {
    console.log(`a ${ws.xDuncteBot} connected`);
    console.log(req);

    ws.on('message', function handler(data) {
        if (dashboards.has(this)) {
            console.log(`Dashboard broadcast: ${JSON.stringify(data)}`);
            bots.forEach((bot) => {
                bot.send(data);
            });
        } else if (bots.has(this)) {
            console.log(`Bot broadcast: ${JSON.stringify(data)}`);
            dashboards.forEach((dash) => {
                dash.send(data);
            });
        }
    });

    ws.on('close', function (code, reason) {
        console.log(`${this.xDuncteBot} closed with code ${code} and reason "${reason}"`);

        bots.delete(this);
        dashboards.delete(this);
    });
});

httpServer.on('upgrade', async (request, socket, head) => {
    const { authorization, 'x-dunctebot': xDuncteBot } = request.headers;
    const verified = await verifyToken(authorization)

    if (!verified) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    // authenticate
    server.handleUpgrade(request, socket, head, (ws) => {
        ws.xDuncteBot = xDuncteBot;

        if (xDuncteBot === 'bot') {
            bots.add(ws);
        } else if (xDuncteBot === 'dashboard') {
            dashboards.add(ws);
        } else {
            ws.terminate();
            return;
        }

        server.emit('connection', ws, request);
    });
});

httpServer.listen(process.env.PORT)
