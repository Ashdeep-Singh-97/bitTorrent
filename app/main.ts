import axios from 'axios';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as net from 'net';
import { EventEmitter } from 'events';

class BitTorrentClient extends EventEmitter {
  private socket: net.Socket;

  constructor(socket: net.Socket) {
    super();
    this.socket = socket;
  }

  static async connect(host: string, port: number): Promise<BitTorrentClient> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.connect(port, host, () => resolve(new BitTorrentClient(socket)));
      socket.on('error', reject);
    });
  }

  async downloadPiece(outputPath: string, torrentFilePath: string, pieceIndex: number): Promise<void> {
    try {
      const content = fs.readFileSync(torrentFilePath);
      const decoded = decodeBencode(content.toString('binary'));

      const info_hash = crypto.createHash('sha1').update(encodeBencode(decoded.info)).digest("hex");
      const pieceLength = decoded.info['piece length'];
      const pieces = decoded.info.pieces;
      const pieceHash = pieces.slice(pieceIndex * 20, (pieceIndex + 1) * 20);

      const peerId = crypto.randomBytes(20).toString("hex");
      const port = 6881;
      const uploaded = 0;
      const downloaded = 0;
      const left = decoded.info.length;
      const compact = 1;

      const trackerUrl = `${decoded.announce}?info_hash=${encodeURIComponent(info_hash)}&peer_id=${peerId}&port=${port}&uploaded=${uploaded}&downloaded=${downloaded}&left=${left}&compact=${compact}`;

      const response = await axios.get(trackerUrl);
      const decodedPeers = decodeBencode(response.data);
      const peers = getPeers(decodedPeers.peers);

      if (peers.length === 0) {
        console.error("No peers found.");
        return;
      }

      const selectedPeer = peers[0];
      const [ip, peerPort] = selectedPeer.split(":");
      const textEncoder = new TextEncoder();
      const handshake = Uint8Array.from([
        19,
        ...textEncoder.encode("BitTorrent protocol"),
        ...Array(8).fill(0),
        ...info_hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)),
        ...textEncoder.encode(peerId),
      ]);

      this.socket.connect(parseInt(peerPort), ip, () => {
        this.socket.write(handshake);
      });

      const writeStream = fs.createWriteStream(outputPath);

      this.socket.on("data", (data: Buffer) => {
        const pieceMessage = data.toString("binary");

        // Here we need to check for the actual data message structure according to the BitTorrent protocol
        // This is a simplified example of how you might handle it:
        if (pieceMessage.includes(pieceHash.toString())) {
          writeStream.write(data);
        }
      });

      this.socket.on("end", () => {
        writeStream.end();
        console.log(`Piece ${pieceIndex} downloaded and saved to ${outputPath}`);
        this.socket.destroy();
      });

      this.socket.on("close", () => {
        console.log('Connection closed');
      });

      this.socket.on("error", (error) => {
        console.error("Socket error:", error.message);
      });
    } catch (error: any) {
      console.error("Error downloading piece:", error.message);
    }
  }
}

// Function to decode peer addresses from a compact binary format
function getPeers(v: string): string[] {
  const result: string[] = [];
  for (let pos = 0; pos < v.length; pos += 6) {
    const ip = v.slice(pos, pos + 4).split("").map(c => c.charCodeAt(0)).join(".");
    const port = (v.charCodeAt(pos + 4) * 256 + v.charCodeAt(pos + 5));
    result.push(`${ip}:${port}`);
  }
  return result;
}

// Function to encode various types to Bencode format
function encodeBencode(value: any): string {
  if (typeof value === 'number') {
    return `i${value}e`; // Encode integers
  } else if (typeof value === 'string') {
    return `${value.length}:${value}`; // Encode strings
  } else if (Array.isArray(value)) {
    return 'l' + value.map(encodeBencode).join('') + 'e'; // Encode lists
  } else if (typeof value === 'object' && value !== null) {
    let encodedDict = 'd';
    const sortedKeys = Object.keys(value).sort();
    for (const key of sortedKeys) {
      encodedDict += encodeBencode(key) + encodeBencode(value[key]);
    }
    return encodedDict + 'e'; // Encode dictionaries
  } else {
    throw new Error('Unsupported data type for Bencode encoding');
  }
}

// Function to decode a Bencoded string into a JavaScript object
function decodeBencode(bencodedValue: string): any {
  function decodeNext(startIndex: number): [any, number] {
    const currentChar = bencodedValue[startIndex];
    if (currentChar === 'i') {
      const endIndex = bencodedValue.indexOf('e', startIndex);
      const value = parseInt(bencodedValue.substring(startIndex + 1, endIndex));
      return [value, endIndex + 1];
    } else if (currentChar === 'd') {
      const dict: { [key: string]: any } = {};
      let currentIndex = startIndex + 1;
      while (bencodedValue[currentIndex] !== 'e') {
        const [key, nextIndex] = decodeNext(currentIndex);
        const [value, nextIndex2] = decodeNext(nextIndex);
        dict[key] = value;
        currentIndex = nextIndex2;
      }
      return [dict, currentIndex + 1];
    } else if (!isNaN(parseInt(currentChar))) {
      const colonIndex = bencodedValue.indexOf(':', startIndex);
      const length = parseInt(bencodedValue.substring(startIndex, colonIndex));
      const strValue = bencodedValue.substring(colonIndex + 1, colonIndex + 1 + length);
      return [strValue, colonIndex + 1 + length];
    } else {
      throw new Error("Invalid format");
    }
  }

  const [decoded] = decodeNext(0);
  return decoded;
}

// Main logic
const args = process.argv;

if (args[2] === "download") {
  const outputPath = args[4]; // Output file path
  const torrentFilePath = args[5]; // Path to the torrent file
  const pieceIndex = parseInt(args[6]); // Index of the piece to download

  if (isNaN(pieceIndex)) {
    console.error("Invalid piece index provided.");
    process.exit(1);
  }

  // Create an instance of BitTorrentClient and start downloading the piece
  const client = new BitTorrentClient(new net.Socket());
  client.downloadPiece(outputPath, torrentFilePath, pieceIndex);
}
