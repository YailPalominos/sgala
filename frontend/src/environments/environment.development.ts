import packageJson from '../../package.json';

export const environment = {
  production: false,

  apiUrl: 'http://10.1.33.98:4059/api/',

  // Socket.IO
  socketUrl: 'http://10.1.33.98:4061/socket',
  socketPath: '/sgala/socket.io',

  // Conexión del agente
  agentSocketUrl: 'https://10.1.33.98:4061',
  agentSocketPath: '/sgala/socket.io',

  version: packageJson.version,

  puertos: {
    api: 4059,
    broker: 4060,
    socket: 4061,
  },
};
