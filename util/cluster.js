/*
globals
require, setInterval
*/
'use strict';

let {DefaultInt, LS} = require('./js/common.js'),
    cluster = require('cluster'),
    os = require('os'),
    argv = require('yargs').argv;

let // bonus = DefaultInt(argv.bonus, 0),
    numServer = 1,
    portnum = DefaultInt(argv.port, 8000);

if (argv.port != undefined)
    argv.port = portnum;

function eachWorker(callback) {
    for (let id in cluster.workers)
        callback(cluster.workers[id]);
}

if (cluster.isMaster) {
    let clientCount = 0,
        count = 0,
        cpus = os.cpus().length;

    for (let i = 0; i < numServer; i ++) {
        LS(`Forking for ${cpus} CPUs`);
        count = 0;
        let worker = cluster.fork();

        worker.on('message', function(msg) {
            if (typeof msg.users != 'undefined') {
                LS(`CLUSTER: count=${count} : msg.users=${parseInt(msg.users)} : clientCount=${clientCount}`);
                count = parseInt(count) + parseInt(msg.users);
                clientCount ++;
            }
        });
    }

    let updateWorkers = () => {
        eachWorker(worker => {
        if (clientCount == numServer)
            worker.send({'count':count});
        });
        count = 0;
        clientCount = 0;
    };

    updateWorkers();
    setInterval(updateWorkers, 10000);

    cluster.on('exit', (worker, code) => {
        if (code !== 0 && !worker.exitedAfterDisconnect) {
            LS(`Worker ${worker.id} crashed. Starting a new worker...`);
            cluster.fork();
        }
    });
}
else
    require('./server-new.js');
