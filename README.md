# vite-graphql-tag-plugin

A Vite plugin that pre-compiles `gql` tagged template literals at build time.
This removes the runtime GraphQL parse cost and avoids shipping `graphql-tag` parsing logic to the client.
Supports Vite 7 and Vite 8.

## Installation

```bash
npm i -D vite-plugin-graphql-tag
```

## Usage

```ts
import { defineConfig } from "vite";
import gqlTagPlugin from "vite-plugin-graphql-tag";

export default defineConfig({
  plugins: [gqlTagPlugin()],
});
```

## Supported Scenarios

- ESM default import from configured `importSources`
```ts
import gql from "graphql-tag";
const query = gql`query Foo { bar }`;
```

- ESM named import when the imported identifier is listed in `gqlTagIdentifiers`
```ts
import { gql } from "@apollo/client";
const query = gql`query Foo { bar }`;
```

- CommonJS require with identifier binding
```ts
const gql = require("graphql-tag");
const query = gql`query Foo { bar }`;
```

- CommonJS require with object destructuring
```ts
const { gql } = require("@apollo/client");
const query = gql`query Foo { bar }`;
```

- Interpolations that resolve through identifier/member-expression access (`Identifier`, `MemberExpression`, and `ChainExpression`) for `.definitions` concatenation
```ts
const query = gql`
  query Foo { ...Bar }
  ${BarFragment}
`;
```

## Unsupported Scenarios

- Aliased imports/destructuring are not currently transformed
```ts
import { gql as myGql } from "@apollo/client";
const { gql: myGql2 } = require("@apollo/client");
```

- Unsupported interpolation expression kinds (anything other than `Identifier`, `MemberExpression`, and `ChainExpression`, for example literals or calls) are left untransformed
```ts
gql`query Foo { ...Bar } ${"x"}`; // literal interpolation
gql`query Foo { ...Bar } ${makeFragment()}`; // call expression interpolation
```

- Invalid GraphQL is not transformed. Behavior is controlled by `onError`:
  - `"warn"`: warning + source left unchanged
  - `"error"`: build fails

## Options

### importSources

Controls import sources used to detect GraphQL tag bindings.
@default `['graphql-tag', '@apollo/client']`

```tsx
gqlTagPlugin({
  importSources: ["graphql-tag", "@apollo/client", "some-other-package"],
});
```

### gqlTagIdentifiers

Controls which identifiers are considered GraphQL tags for named import / `require` property matching.
@default `['gql']`

Note: default imports from configured `importSources` are always treated as GraphQL tags, regardless of this option.

```tsx
gqlTagPlugin({
  gqlTagIdentifiers: ["gql", "graphql"],
});
```

### strip

Whether to run `stripIgnoredCharacters` from `graphql` before parsing.
@default `false`

```tsx
gqlTagPlugin({
  strip: true,
});
```

### onlyMatchImportSuffix

If `true`, import source matching uses suffix matching instead of exact matching.

@default `false`

```tsx
gqlTagPlugin({
  onlyMatchImportSuffix: true,
});
```

### onError

Controls how transform-time GraphQL/interpolation errors are reported.

@default `'warn'`

- `'warn'`: emits a plugin warning and leaves the file unchanged.
- `'error'`: emits a plugin error and fails the build.

```tsx
gqlTagPlugin({
  onError: "warn",
});
```

```tsx
gqlTagPlugin({
  onError: "error",
});
```

### filter

By default, the plugin processes files whose source code looks like it contains one of the configured tag identifiers followed by a template literal.
You can provide a custom hook filter to control file selection.

If you want the plugin to process all files, regardless of their content, you can pass the following:

```tsx
gqlTagPlugin({
  filter: {
    code: {
      include: null,
    },
  },
});
```

@default Matches configured tag identifiers (for example `gql`) followed by optional whitespace and a template literal backtick.

You can learn more about custom filters in the [Vite documentation](https://vite.dev/guide/api-plugin#hook-filters).

## Credits

This plugin is inspired by [babel-plugin-graphql-tag](https://github.com/gajus/babel-plugin-graphql-tag)
