export default class Peer {

    public ipAddress: string;
  
    public port: number;
  
    constructor(ipAddress: string, port: number) {
  
      this.ipAddress = ipAddress;
  
      this.port = port;
  
    }
  
    toString(): string {
  
      return `${this.ipAddress}:${this.port}`;
  
    }
  
    static fromString(string: string): Peer {
  
      if (!string.includes(":")) {
  
        throw new Error('Argument "string" is invalid');
  
      }
  
      const [ipAddress, port] = string.split(":");
  
      return new Peer(ipAddress, +port);
  
    }
  
  }