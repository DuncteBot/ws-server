import websocket from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { verifyToken } from 'duncteApi';

dotenv.config();

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
    ws.on('message', (data) => {
        console.log(data);

        ws.close();
    });
});

httpServer.on('upgrade', async (request, socket, head) => {
    console.log(request.headers);

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
