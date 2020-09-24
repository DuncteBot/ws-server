import { Server } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// sets of websocket clients
const bots = new Set();
const dashboards = new Set();

const httpServer = http.createServer();

const server = new Server({
    noServer: true,
    clientTracking: false,
});

httpServer.on('upgrade', async (request, socket, head) => {
    // TODO: validate autorisation header
    // use header to check if it's a bot or a dashboard connecting
    console.log(request);

    // authenticate
    server.handleUpgrade(request, socket, head, (ws) => {
        server.emit('connection', ws, request);
    });
});

httpServer.listen(process.env.PORT)
