interface Window {
  SGALA_CONFIG: {
    apiUrl: string;
    socketUrl: string;
    socketPath: string;
    agentSocketUrl: string;
    agentSocketPath: '/socket.io';
    version: string;
    puertos: {
      api: number;
      broker: number;
      socket: number;
    };
  };
}
