// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-03
/*
globals
console, process, require
*/
'use strict';

let fs = require('fs'),
    {LS} = require('./js/common'),
    {parse_pgn} = require('./js/game');

for (let name of process.argv.slice(2)) {
    fs.readFile(name, 'utf8', (err, data) => {
        if (err)
            return;
        let dico = parse_pgn(data);
        if (!dico)
            return;

        let sum_moves = [0, 0],
            sum_times = [0, 0];
        dico.Moves.forEach((move, ply) => {
            if (!move.n)
                return;
            sum_moves[ply % 2] += move.n * 1.0;
            sum_times[ply % 2] += move.mt * 0.001;
        });
        let nps = [sum_moves[0] / sum_times[0], sum_moves[1] / sum_times[1]];
        LS(`${name} : ${nps[0]} : ${nps[1]}`);
    });
}
