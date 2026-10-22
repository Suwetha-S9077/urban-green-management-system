import fs from 'node:fs';

/** Streams each element of the top-level "features" array, one parsed object at a time. */
export async function* streamFeatures(file, chunkSize = 1 << 20) {
  const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: chunkSize });
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strBuf = '';
  let lastTopString = '';
  let inFeatures = false;
  let capturing = false;
  let parts = [];
  let segStart = 0;

  for await (const chunk of stream) {
    segStart = 0;
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk.charCodeAt(i);
      if (inStr) {
        if (esc) {
          esc = false;
          if (depth === 1) strBuf += chunk[i];
        } else if (c === 92) {
          esc = true;
        } else if (c === 34) {
          inStr = false;
          if (depth === 1) lastTopString = strBuf;
        } else if (depth === 1) {
          strBuf += chunk[i];
        }
        continue;
      }
      if (c === 34) {
        inStr = true;
        strBuf = '';
      } else if (c === 123) {
        if (inFeatures && depth === 2 && !capturing) {
          capturing = true;
          segStart = i;
          parts = [];
        }
        depth++;
      } else if (c === 91) {
        if (depth === 1) inFeatures = lastTopString === 'features';
        depth++;
      } else if (c === 125) {
        depth--;
        if (capturing && depth === 2) {
          parts.push(chunk.slice(segStart, i + 1));
          capturing = false;
          const text = parts.join('');
          parts = [];
          yield JSON.parse(text);
        }
      } else if (c === 93) {
        depth--;
        if (inFeatures && depth === 1) inFeatures = false;
      }
    }
    if (capturing) parts.push(chunk.slice(segStart));
  }
}
