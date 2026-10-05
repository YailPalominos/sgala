import packageJson from '../../package.json';

export const environment = {
  production: false,
  apiUrl: 'http://192.168.1.5:3000/api/',
  socketUrl: 'http://192.168.1.5:4061/socket',
  version: packageJson.version,
};
