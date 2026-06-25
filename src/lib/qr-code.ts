const QR_VERSION = 6;
const QR_SIZE = 21 + (QR_VERSION - 1) * 4;
const DATA_CODEWORDS = 136;
const ECC_CODEWORDS_PER_BLOCK = 18;
const BLOCK_COUNT = 2;
const BLOCK_DATA_CODEWORDS = DATA_CODEWORDS / BLOCK_COUNT;
const MASK_PATTERN = 0;

type QrMatrix = boolean[][];

export function createQrCodeMatrix(value: string) {
  const dataCodewords = createDataCodewords(value);
  const allCodewords = addErrorCorrection(dataCodewords);
  return drawQrCode(allCodewords);
}

export function createQrSvgPath(matrix: QrMatrix, quietZone = 4) {
  const commands: string[] = [];

  matrix.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (isDark) {
        commands.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
      }
    });
  });

  return commands.join("");
}

export function getQrSvgViewBox(matrix: QrMatrix, quietZone = 4) {
  const size = matrix.length + quietZone * 2;
  return `0 0 ${size} ${size}`;
}

function createDataCodewords(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));

  if (bytes.length > DATA_CODEWORDS - 2) {
    throw new Error("Check-in URL is too long to fit in the QR code.");
  }

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);

  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const maxBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, maxBits - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bitsToByte(bits.slice(i, i + 8)));
  }

  for (let padByte = 0xec; codewords.length < DATA_CODEWORDS; padByte ^= 0xfd) {
    codewords.push(padByte);
  }

  return codewords;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function bitsToByte(bits: number[]) {
  return bits.reduce((byte, bit) => (byte << 1) | bit, 0);
}

function addErrorCorrection(dataCodewords: number[]) {
  const generator = createGeneratorPolynomial(ECC_CODEWORDS_PER_BLOCK);
  const blocks = Array.from({ length: BLOCK_COUNT }, (_, index) => {
    const start = index * BLOCK_DATA_CODEWORDS;
    const data = dataCodewords.slice(start, start + BLOCK_DATA_CODEWORDS);

    return {
      data,
      ecc: calculateRemainder(data, generator),
    };
  });
  const result: number[] = [];

  for (let i = 0; i < BLOCK_DATA_CODEWORDS; i += 1) {
    blocks.forEach((block) => result.push(block.data[i]));
  }

  for (let i = 0; i < ECC_CODEWORDS_PER_BLOCK; i += 1) {
    blocks.forEach((block) => result.push(block.ecc[i]));
  }

  return result;
}

function createGeneratorPolynomial(degree: number) {
  let result = [1];

  for (let i = 0; i < degree; i += 1) {
    const next = new Array(result.length + 1).fill(0);

    result.forEach((coefficient, index) => {
      next[index] ^= coefficient;
      next[index + 1] ^= gfMultiply(coefficient, gfPow(i));
    });

    result = next;
  }

  return result;
}

function calculateRemainder(data: number[], generator: number[]) {
  const degree = generator.length - 1;
  const result = new Array(degree).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);

    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  });

  return result;
}

function drawQrCode(codewords: number[]) {
  const modules = createMatrix(false);
  const isFunction = createMatrix(false);

  drawFunctionPatterns(modules, isFunction);
  drawCodewords(modules, isFunction, codewords);
  drawFormatBits(modules, isFunction);

  return modules;
}

function createMatrix(value: boolean) {
  return Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(value));
}

function drawFunctionPatterns(modules: QrMatrix, isFunction: QrMatrix) {
  drawFinderPattern(modules, isFunction, 3, 3);
  drawFinderPattern(modules, isFunction, QR_SIZE - 4, 3);
  drawFinderPattern(modules, isFunction, 3, QR_SIZE - 4);
  drawAlignmentPattern(modules, isFunction, 34, 34);

  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    setFunctionModule(modules, isFunction, 6, i, i % 2 === 0);
    setFunctionModule(modules, isFunction, i, 6, i % 2 === 0);
  }

  setFunctionModule(modules, isFunction, 8, QR_SIZE - 8, true);
  drawFormatBits(modules, isFunction);
}

function drawFinderPattern(
  modules: QrMatrix,
  isFunction: QrMatrix,
  centerX: number,
  centerY: number,
) {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const x = centerX + dx;
      const y = centerY + dy;

      if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) {
        continue;
      }

      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunctionModule(
        modules,
        isFunction,
        x,
        y,
        distance !== 2 && distance !== 4,
      );
    }
  }
}

function drawAlignmentPattern(
  modules: QrMatrix,
  isFunction: QrMatrix,
  centerX: number,
  centerY: number,
) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunctionModule(
        modules,
        isFunction,
        centerX + dx,
        centerY + dy,
        distance !== 1,
      );
    }
  }
}

function drawCodewords(
  modules: QrMatrix,
  isFunction: QrMatrix,
  codewords: number[],
) {
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1),
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = upward ? QR_SIZE - 1 - vertical : vertical;

      for (let x = right; x >= right - 1; x -= 1) {
        if (isFunction[y][x]) {
          continue;
        }

        const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        modules[y][x] = bit !== getMaskBit(x, y);
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function drawFormatBits(modules: QrMatrix, isFunction: QrMatrix) {
  const data = (0b01 << 3) | MASK_PATTERN;
  let remainder = data;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }

  const bits = ((data << 10) | remainder) ^ 0x5412;

  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(modules, isFunction, 8, i, getBit(bits, i));
  }

  setFunctionModule(modules, isFunction, 8, 7, getBit(bits, 6));
  setFunctionModule(modules, isFunction, 8, 8, getBit(bits, 7));
  setFunctionModule(modules, isFunction, 7, 8, getBit(bits, 8));

  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(modules, isFunction, 14 - i, 8, getBit(bits, i));
  }

  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(modules, isFunction, QR_SIZE - 1 - i, 8, getBit(bits, i));
  }

  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(modules, isFunction, 8, QR_SIZE - 15 + i, getBit(bits, i));
  }

  setFunctionModule(modules, isFunction, 8, QR_SIZE - 8, true);
}

function setFunctionModule(
  modules: QrMatrix,
  isFunction: QrMatrix,
  x: number,
  y: number,
  isDark: boolean,
) {
  modules[y][x] = isDark;
  isFunction[y][x] = true;
}

function getMaskBit(x: number, y: number) {
  return (x + y) % 2 === 0;
}

function getBit(value: number, index: number) {
  return ((value >>> index) & 1) !== 0;
}

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);

let fieldValue = 1;

for (let i = 0; i < 255; i += 1) {
  GF_EXP[i] = fieldValue;
  GF_LOG[fieldValue] = i;
  fieldValue <<= 1;

  if (fieldValue & 0x100) {
    fieldValue ^= 0x11d;
  }
}

for (let i = 255; i < GF_EXP.length; i += 1) {
  GF_EXP[i] = GF_EXP[i - 255];
}

function gfMultiply(left: number, right: number) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function gfPow(power: number) {
  return GF_EXP[power];
}
