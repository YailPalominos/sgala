import packageJson from '../../package.json';

export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api/',
  socketUrl: 'http://localhost:4061/socket',
  version: packageJson.version,
};
