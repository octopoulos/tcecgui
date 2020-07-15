// Include Nodejs' net module.
/*
globals
console, require
*/
'use strict';

let Chess = require('./js/libs/chess-quick').Chess,
    Net = require('net');

let LS = console.log,
    port = 8090,
    server = new Net.Server();

server.listen(port, () => {
    LS(`Server listening for connection requests on socket localhost:${port}.`);
});

let chess = new Chess(),
    count = 1,
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ips = {},
    votes = {c2c4: count, b1c3: 1, e2e4: 3, a2a4: 4};

server.on('connection', socket => {
    let ip = socket.remoteAddress;
    LS(`A new connection has been established: ${ip}.`);
    if (ip != '::ffff:127.0.0.1') {
        LS('Not local connection, closing');
        socket.destroy();
        return;
    }

    socket.on('data', chunk => {
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
                    let move = {
                            from: best_move.slice(0, 2),
                            to: best_move.slice(2, 4),
                        },
                        pos = best_move.indexOf('=');
                    if (pos > 0)
                        move.promotion = best_move[pos + 1];
                    LS(move);
                    let result = chess.move(move);
                    LS(result);
                    if (result)
                        fen = chess.fen();
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
