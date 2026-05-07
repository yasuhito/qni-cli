import type { Writable } from 'node:stream';

const APC_BEGIN = '\u001b_G';
const APC_END = '\u001b\\';
const CHUNK_SIZE = 4096;
const DEFAULT_GAP_MS = 90;
const PNG_FORMAT = 100;

export class KittyGraphicsEmitter {
  private nextImageId = 1;
  private readonly output: Writable;

  constructor(output: Writable = process.stdout) {
    this.output = output;
  }

  emitPngFrame(pngBytes: Buffer): void {
    this.emitPayload(`a=T,f=${PNG_FORMAT}`, pngBytes);
  }

  emitAnimation(pngFrames: readonly Buffer[], gapMs = DEFAULT_GAP_MS): void {
    const imageId = this.allocateImageId();
    const firstFrame = pngFrames[0];

    if (!firstFrame) {
      return;
    }

    this.emitPayload(`a=T,f=${PNG_FORMAT},i=${imageId}`, firstFrame);
    this.emitCommand(`a=a,i=${imageId},r=1,z=${gapMs}`);

    for (const pngFrame of pngFrames.slice(1)) {
      this.emitPayload(`a=f,f=${PNG_FORMAT},i=${imageId},z=${gapMs}`, pngFrame);
    }

    this.emitCommand(`a=a,i=${imageId},s=3,v=1`);
  }

  private allocateImageId(): number {
    const imageId = this.nextImageId;
    this.nextImageId += 1;
    return imageId;
  }

  private emitPayload(command: string, pngBytes: Buffer): void {
    for (const [chunk, moreChunks] of payloadChunks(pngBytes)) {
      this.writeApc(`${command},m=${moreChunks};${chunk}`);
    }
  }

  private emitCommand(command: string): void {
    this.writeApc(command);
  }

  private writeApc(command: string): void {
    this.output.write(`${APC_BEGIN}${command}${APC_END}`);
  }
}

function payloadChunks(pngBytes: Buffer): Array<[string, 0 | 1]> {
  const encodedPng = pngBytes.toString('base64');
  const chunks = encodedPng.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gu')) ?? [];

  return chunks.map((chunk, index) => [chunk, index < chunks.length - 1 ? 1 : 0]);
}
