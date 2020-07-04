// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-03
/*
globals
console, process, require
*/
'use strict';

let fs = require('fs'),
    {Floor, LS} = require('./js/common'),
    {parse_pgn} = require('./js/game');

/**
 * Get PGN stats
 * @param {string} name
 * @returns {[]*}
 */
function get_pgn_stats(name, callback) {
    fs.readFile(name, 'utf8', (err, data) => {
        if (err) {
            callback(null);
            return;
        }
        let dico = parse_pgn(data);
        if (!dico) {
            callback(null);
            return;
        }

        let sum_moves = [0, 0],
            sum_times = [0, 0];
        dico.Moves.forEach((move, ply) => {
            if (!move.n)
                return;
            sum_moves[ply % 2] += move.n * 1.0;
            sum_times[ply % 2] += move.mt * 0.001;
        });
        let nps = [Floor(sum_moves[0] / sum_times[0]), Floor(sum_moves[1] / sum_times[1])];
        callback(nps);
    });
}

for (let name of process.argv.slice(2)) {
    get_pgn_stats(name, stats => {
        LS(`${name} : ${stats? stats.join(' '): stats}`);
    });
}
