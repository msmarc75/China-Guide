/**
 * Tiny YAML-subset front-matter parser.
 *
 * Supported: `key: value`, quoted strings, inline arrays `[a, b]`,
 * block arrays (`- item`), booleans, numbers, and one level of nested maps.
 */

function coerce(raw) {
  const value = raw.trim();
  if (value === '') return '';
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return value.slice(1, -1);
  if (/^\[.*\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((v) => coerce(v));
  }
  return value;
}

export function parseFrontmatter(source) {
  const text = String(source).replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return { data: {}, body: text };

  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };

  const head = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, '');
  const data = {};

  const lines = head.split('\n');
  let currentKey = null;
  let currentList = null;
  let currentMap = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey) {
      const item = listItem[1];
      const nested = /^(\w[\w-]*):\s*(.*)$/.exec(item);
      if (nested) {
        currentMap = { [nested[1]]: coerce(nested[2]) };
        currentList = currentList || [];
        currentList.push(currentMap);
      } else {
        currentList = currentList || [];
        currentList.push(coerce(item));
        currentMap = null;
      }
      data[currentKey] = currentList;
      continue;
    }

    const nestedPair = /^\s{2,}(\w[\w-]*):\s*(.*)$/.exec(line);
    if (nestedPair && currentMap) {
      currentMap[nestedPair[1]] = coerce(nestedPair[2]);
      continue;
    }

    const pair = /^(\w[\w-]*):\s*(.*)$/.exec(line);
    if (pair) {
      currentKey = pair[1];
      currentList = null;
      currentMap = null;
      const value = pair[2];
      if (value === '') {
        data[currentKey] = [];
      } else {
        data[currentKey] = coerce(value);
        currentKey = null;
      }
    }
  }

  return { data, body };
}
