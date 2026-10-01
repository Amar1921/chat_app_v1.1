import { StringDecoder } from 'node:string_decoder';

// Les fragments réseau ne correspondent ni aux caractères ni aux lignes SSE.
export function createSseDecoder(onLine) {
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  function consume(text) {
    buffer += text;
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, '');
      buffer = buffer.slice(index + 1);
      onLine(line);
    }
  }
  return {
    write(chunk) { consume(decoder.write(chunk)); },
    end() {
      consume(decoder.end());
      if (buffer) onLine(buffer.replace(/\r$/, ''));
      buffer = '';
    },
  };
}
