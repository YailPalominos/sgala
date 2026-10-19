import packageJson from '../../package.json';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:4059/api/',
  socketUrl: 'http://localhost:4061/socket',
  version: packageJson.version,
};
