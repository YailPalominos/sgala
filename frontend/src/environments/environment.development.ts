import packageJson from '../../package.json';

export const environment = {
  production: false,
  apiUrl: 'http://10.1.33.50:3000/api/',
  socketUrl: 'http://10.1.33.50:4061/socket',
  version: packageJson.version,
};
