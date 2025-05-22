# TAFIC

**To ASCII First Impression Converter**

TAFIC is a TypeScript library that normalizes any string to its closest ASCII "first impression" to produce a clean ASCII-only string.

---

## Installation

```bash
npm install tafic
```

---

## Quick Start

```ts
import { TAFIC } from "tafic";

const dirty = "Héllø, wørld! 👋";
const clean = TAFIC.Normalize(dirty);

console.log(clean); // output: "Hello, world!"
```

### API

#### `TAFIC.Normalize(str: string, options?: Options): string`

* `str` — the input string to normalize.
* `options.skipHardcodedMapping?: boolean` — skip the built-in homoglyph map (default `false`).
* `options.removeLeftovers?: boolean` — remove any remaining non-ASCII characters (default `true`).
* `options.onLeftovers?: (nonASCII: string) => void` — callback for non-ASCII leftovers.

Returns the normalized ASCII-only string.

---

## Building & Testing

```bash
# Build for production
npm run build

# Run maintenance scripts
npm run maintaining:hcmap
npm run maintaining:culprits
```

---

## License

This project is licensed under the ISC License. See [LICENSE](LICENSE) for details.