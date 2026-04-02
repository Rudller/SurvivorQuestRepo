type FileSignatureRule = {
  mimeType: string;
  signatures: number[][];
};

const FILE_SIGNATURE_RULES: FileSignatureRule[] = [
  {
    mimeType: 'image/jpeg',
    signatures: [[0xff, 0xd8, 0xff]],
  },
  {
    mimeType: 'image/png',
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  {
    mimeType: 'image/webp',
    signatures: [[0x52, 0x49, 0x46, 0x46]],
  },
  {
    mimeType: 'application/pdf',
    signatures: [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  },
  {
    mimeType: 'audio/mpeg',
    signatures: [
      [0x49, 0x44, 0x33],
      [0xff, 0xfb],
      [0xff, 0xf3],
      [0xff, 0xf2],
    ],
  },
  {
    mimeType: 'audio/wav',
    signatures: [[0x52, 0x49, 0x46, 0x46]],
  },
  {
    mimeType: 'audio/ogg',
    signatures: [[0x4f, 0x67, 0x67, 0x53]],
  },
];

function matchesPrefix(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length) {
    return false;
  }

  for (let index = 0; index < prefix.length; index += 1) {
    if (bytes[index] !== prefix[index]) {
      return false;
    }
  }

  return true;
}

export function hasExpectedFileSignature(mimeType: string, buffer: Buffer) {
  const rule = FILE_SIGNATURE_RULES.find((item) => item.mimeType === mimeType);
  if (!rule) {
    return false;
  }

  const bytes = new Uint8Array(buffer);
  if (rule.mimeType === 'image/webp') {
    if (!matchesPrefix(bytes, rule.signatures[0])) {
      return false;
    }

    const webpHeader = Buffer.from(buffer.subarray(8, 12)).toString('ascii');
    return webpHeader === 'WEBP';
  }

  if (rule.mimeType === 'audio/wav') {
    if (!matchesPrefix(bytes, rule.signatures[0])) {
      return false;
    }

    const wavHeader = Buffer.from(buffer.subarray(8, 12)).toString('ascii');
    return wavHeader === 'WAVE';
  }

  return rule.signatures.some((signature) => matchesPrefix(bytes, signature));
}
