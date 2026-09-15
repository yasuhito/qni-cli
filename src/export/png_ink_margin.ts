import { PNG } from "pngjs";

interface Pixel {
  readonly alpha: number;
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

interface InkBounds {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

const BLACK: Pixel = { alpha: 255, blue: 0, green: 0, red: 0 };
const WHITE: Pixel = { alpha: 255, blue: 255, green: 255, red: 255 };
const CLEAR: Pixel = { alpha: 0, blue: 0, green: 0, red: 0 };

export type PngBackground = "black" | "white";

export function flattenPngBackground(
  source: Buffer,
  background: PngBackground
): Buffer {
  const input = PNG.sync.read(source);
  const output = new PNG({ height: input.height, width: input.width });
  const backgroundPixel = pixelForBackground(background);

  fill(output, backgroundPixel);
  copyRegion(input, output, fullBounds(input), 0, backgroundPixel);

  return opaquePng(output);
}

export function normalizePngInkMargin(
  source: Buffer,
  margin: number,
  background?: PngBackground
): Buffer {
  const input = PNG.sync.read(source);
  const bounds = inkBounds(input);
  const output = new PNG({
    height: bounds.bottom - bounds.top + margin * 2,
    width: bounds.right - bounds.left + margin * 2,
  });

  const backgroundPixel =
    background === undefined ? undefined : pixelForBackground(background);

  fill(output, backgroundPixel ?? CLEAR);
  copyRegion(input, output, bounds, margin, backgroundPixel);

  return background === undefined
    ? PNG.sync.write(output, {
        colorType: 6,
        inputColorType: 6,
        inputHasAlpha: true,
      })
    : opaquePng(output);
}

function copyRegion(
  input: PNG,
  output: PNG,
  bounds: InkBounds,
  margin: number,
  background?: Pixel
): void {
  for (let y = bounds.top; y < bounds.bottom; y += 1) {
    for (let x = bounds.left; x < bounds.right; x += 1) {
      const source = pixelAt(input, x, y);
      const target =
        background === undefined ? source : composite(source, background);
      setPixel(
        output,
        x - bounds.left + margin,
        y - bounds.top + margin,
        target
      );
    }
  }
}

function composite(foreground: Pixel, background: Pixel): Pixel {
  const alpha = foreground.alpha / 255;
  const blend = (front: number, back: number): number =>
    Math.round(front * alpha + back * (1 - alpha));

  return {
    alpha: 255,
    blue: blend(foreground.blue, background.blue),
    green: blend(foreground.green, background.green),
    red: blend(foreground.red, background.red),
  };
}

function fullBounds(image: PNG): InkBounds {
  return { bottom: image.height, left: 0, right: image.width, top: 0 };
}

function opaquePng(image: PNG): Buffer {
  return PNG.sync.write(image, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

function pixelForBackground(background: PngBackground): Pixel {
  return background === "black" ? BLACK : WHITE;
}

function fill(image: PNG, pixel: Pixel): void {
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = pixel.red;
    image.data[offset + 1] = pixel.green;
    image.data[offset + 2] = pixel.blue;
    image.data[offset + 3] = pixel.alpha;
  }
}

function inkBounds(image: PNG): InkBounds {
  let bottom = 0;
  let left = image.width;
  let right = 0;
  let top = image.height;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (pixelAt(image, x, y).alpha === 0) {
        continue;
      }

      bottom = Math.max(bottom, y + 1);
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
    }
  }

  if (right <= left || bottom <= top) {
    throw new Error("rendered PNG contains no visible circuit ink");
  }

  return { bottom, left, right, top };
}

function pixelAt(image: PNG, x: number, y: number): Pixel {
  const offset = (y * image.width + x) * 4;

  return {
    alpha: image.data[offset + 3],
    blue: image.data[offset + 2],
    green: image.data[offset + 1],
    red: image.data[offset],
  };
}

function setPixel(image: PNG, x: number, y: number, pixel: Pixel): void {
  const offset = (y * image.width + x) * 4;

  image.data[offset] = pixel.red;
  image.data[offset + 1] = pixel.green;
  image.data[offset + 2] = pixel.blue;
  image.data[offset + 3] = pixel.alpha;
}
