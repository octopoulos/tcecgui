/*
globals
console, require
*/
'use strict';

let Module = require('./js/chess-wasm.js'),
    Net = require('net');

let frc = false,
    LS = console.log,
    port = 8090,
    server = new Net.Server();

server.listen(port, () => {
    LS(`Server listening for connection requests on socket localhost:${port}.`);
});

let chess,
    count = 1,
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ips = {},
    votes = {c2c4: count, b1c3: 1, e2e4: 3, a2a4: 4};

/**
 * Load chess-wasm
 */
async function load_wasm() {
    let instance = await Module();
    chess = new instance.Chess();
    LS('chess library loaded');
}

server.on('connection', async socket => {
    let ip = socket.remoteAddress;
    LS(`A new connection has been established: ${ip}.`);
    if (ip != '::ffff:127.0.0.1') {
        LS('Not local connection, closing');
        socket.destroy();
        return;
    }

    if (!chess)
        await load_wasm();

    socket.on('data', chunk => {
        LS('data');
        // TODO:
        // handle voting on and off messages: send approriate message to users and set global variables to correct values
        let data, text;
        try {
            text = chunk.toString();
            data = JSON.parse(text);
        }
        catch (e) {
            LS(`bad data: ${data}`);
            LS(e);
            return;
        }

        let voting = data.voting;
        if (voting != undefined) {
            if (voting) {
                fen = voting;
                votes = {};
            }
            else {
                let best_move = data.best_move;
                if (best_move) {
                    LS(best_move);
                    let result = chess.moveUci(best_move, frc);
                    LS(result);
                    if (result.piece) {
                        fen = chess.fen();
                        chess.undo();
                    }
                }
            }
        }
        LS(`Data received from client: ${text} => fen=${fen}`);

        // TODO:
        // move this elsewhere: when receiving vote messages from users, update tallies and send to chat_client.py: it will also handle throttling too many updates if needed and will get all updates until time is up.
        let msg = JSON.stringify({
           fen: fen,
           votes: Object.entries(votes),
        });
        LS(`Sending data: ${msg}.`);
        // TODO: remove this
        count ++;

        socket.write(msg.length.toString().padStart(4, " ") + msg);
    });

    socket.on('end', () => {
        LS('Closing connection with the client');
    });

    socket.on('error', err => {
        LS(`Error: ${err}`);
    });
});
