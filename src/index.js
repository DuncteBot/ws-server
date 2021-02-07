import websocket from 'ws';
import http from 'http';
import { init as initApi, verifyToken } from './duncteApi.js';

initApi();

// sets of websocket clients
const bots = new Set();
const dashboards = new Set();

// we're using a separate http server to handle the authorisation
const httpServer = http.createServer();
const server = new websocket.Server({
    noServer: true,
    clientTracking: false,
});

const dataRequests = {};

// if message is from bot, send to dashboards
// else if message is from dashboard, send message to bots
// else do nothing and ignore

server.on('connection', (ws, req) => {
    console.log(`a ${ws.xDuncteBot} connected`);

    ws.on('message', function handler(rw) {
        const data = JSON.parse(rw);

        if (data.t === 'PING') {
            ws.send(JSON.stringify({
                t: 'PONG'
            }));
            return;
        }

        if (dashboards.has(this)) {

            // setup a structure for fetching the data
            if (data.t === 'FETCH_DATA') {
                // we're storing the bot count here in case a bot gets added in the process
                // and did not receive the event
                dataRequests[data.d.identifier] = {
                    botCount: bots.size,
                    responses: [],
                };
            }

            console.log(`Dashboard broadcast: ${rw}`);
            bots.forEach((bot) => {
                bot.send(rw);
            });
        } else if (bots.has(this)) {
            console.log(`Bot broadcast: ${rw}`);

            // collect all the responses from all bots
            if (data.t === 'FETCH_DATA') {
                handleDataCallback(data);
                return;
            }

            dashboards.forEach((dash) => {
                dash.send(rw);
            });
        }
    });

    ws.on('close', function (code, reason) {
        console.log(`${this.xDuncteBot} closed with code ${code} and reason "${reason}"`);

        bots.delete(this);
        dashboards.delete(this);
    });
});

function handleDataCallback(data) {
    const identifier = data.d.identifier;
    const dataReq = dataRequests[identifier];

    // remove the identifier from the allBots part
    delete data.d.identifier;

    dataReq.responses.push(data.d)

    // if we have a response from all bots we can send it to the dashboard
    if (dataReq.responses.length === dataReq.botCount) {
        const finalRequest = {
            t: 'FETCH_DATA',
            d: {
                identifier,
            },
        };

        // map all the requests into one
        for (const res of dataReq.responses) {
            // loop over all the top level keys
            const topLevel = Object.keys(res);

            for (const topKey of topLevel) {
                if (Array.isArray(res[topKey])) {
                    const toPut = finalRequest.d[topKey] ?? [];

                    toPut.push(...res[topKey]);

                    finalRequest.d[topKey] = toPut;
                    continue;
                }

                const toPut = finalRequest.d[topKey] ?? {};
                const keys = Object.keys(res[topKey]);

                for (const key of keys) {
                    toPut[key] = res[topKey][key];
                }

                finalRequest.d[topKey] = toPut;
            }
        }
        
        console.log(JSON.stringify(finalRequest));

        dashboards.forEach((dash) => {
            dash.send(JSON.stringify(finalRequest));
        });
    }
}

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
