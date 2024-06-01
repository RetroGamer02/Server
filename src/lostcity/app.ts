import fs from 'fs';
import axios from 'axios';

import { startWeb } from '#lostcity/web/app.js';

import World from '#lostcity/engine/World.js';

import TcpServer from '#lostcity/server/TcpServer.js';
import WSServer from '#lostcity/server/WSServer.js';

import Environment from '#lostcity/util/Environment.js';
import { packClient, packServer } from './tools/pack/packall.js';
import ScriptProvider from './engine/script/ScriptProvider.js';

if (Environment.UPDATE_ON_STARTUP && !fs.existsSync('RuneScriptCompiler.jar')) {
    // todo: put a checksum on the remote so we can download updates for existing setups
    try {
        const remoteVersionReq = await axios.get('https://github.com/2004scape/RuneScriptCompiler/releases/latest/download/COMPILER_VERSION.txt');
        const remoteVersion = remoteVersionReq.data;

        if (remoteVersion == ScriptProvider.COMPILER_VERSION) {
            const RuneScriptCompiler = await axios.get('https://github.com/2004scape/RuneScriptCompiler/releases/latest/download/RuneScriptCompiler.jar', {
                responseType: 'arraybuffer'
            });
            fs.writeFileSync('RuneScriptCompiler.jar', RuneScriptCompiler.data);
        } else if (remoteVersion > ScriptProvider.COMPILER_VERSION) {
            console.log('notice: Please update your server. There is a new compiler available.');
        }
    } catch (ex) {
        console.error('There was an issue checking for compiler updates.');
    }
}

if (!fs.existsSync('data/pack/client/config')) {
    console.log('Packing cache for the first time, please wait until you see the world is ready.');
    console.log('----');
    await packServer();
    await packClient();
}

fs.mkdirSync('data/players', { recursive: true });

await World.start();

startWeb();

const tcpServer = new TcpServer();
tcpServer.start();

const wsServer = new WSServer();
wsServer.start();

let exiting = false;
process.on('SIGINT', function () {
    if (exiting) {
        return;
    }

    exiting = true;

    if (Environment.LOCAL_DEV) {
        World.rebootTimer(0);
    } else {
        World.rebootTimer(Environment.SHUTDOWN_TIMER as number);
    }
});
