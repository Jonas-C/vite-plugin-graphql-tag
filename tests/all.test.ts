import { rollup } from "rollup";
import { format } from "oxfmt";
import { rolldown } from "rolldown";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetCaches } from "graphql-tag";
import { gqlPlugin } from "../src/index.js";

const fixturesDir = join(__dirname, "fixts");
const folders = readdirSync(fixturesDir).sort((a, b) => a.localeCompare(b));

beforeEach(() => {
  // Isolate tests from graphql-tag global caches.
  resetCaches();
});

const readFixtureOutput = (folder: string): string => {
  return readFileSync(join(fixturesDir, folder, "output.js"), "utf-8").trim();
};

const loadFixtureOptions = async (folder: string) => {
  return import(join(fixturesDir, folder, "options.json")).catch(() => undefined);
};

const normalizeCode = async (code: string) => {
  const formatted = await format("code.js", code.trim(), { objectWrap: "collapse", singleQuote: true });
  return formatted.code;
};

const transformWithRollup = async (input: string, options: Awaited<ReturnType<typeof loadFixtureOptions>>) => {
  let transformedInput: string | undefined;
  const bundle = await rollup({
    input,
    treeshake: false,
    external: () => true,
    plugins: [
      gqlPlugin(options),
      {
        name: "capture-transformed-input",
        transform(code, id) {
          if (id === input) transformedInput = code;
          return null;
        },
      },
    ],
  });

  await bundle.generate({
    format: "es",
    exports: "auto",
  });

  expect(transformedInput).toBeDefined();
  return transformedInput!;
};

const transformWithRolldown = async (input: string, options: Awaited<ReturnType<typeof loadFixtureOptions>>) => {
  let transformedInput: string | undefined;
  const bundle = await rolldown({
    input,
    treeshake: false,
    external: () => true,
    plugins: [
      gqlPlugin(options),
      {
        name: "capture-transformed-input",
        transform(code, id) {
          if (id === input) transformedInput = code;
          return null;
        },
      },
    ],
  });

  await bundle.generate({
    format: "esm",
    exports: "auto",
    polyfillRequire: false,
  });

  expect(transformedInput).toBeDefined();
  return transformedInput!;
};

const assertFixtureOutput = async (
  folder: string,
  transformer: (input: string, options: Awaited<ReturnType<typeof loadFixtureOptions>>) => Promise<string>,
) => {
  const input = join(fixturesDir, folder, "input.js");
  const options = await loadFixtureOptions(folder);
  const transformed = await transformer(input, options);
  const expected = readFixtureOutput(folder);

  const formattedCode = await normalizeCode(transformed);
  const expectedCode = await normalizeCode(expected);
  expect(formattedCode).toEqual(expectedCode);
};

const runDirectTransform = async (
  code: string,
  id = "/virtual/input.js",
  options?: Parameters<typeof gqlPlugin>[0],
) => {
  const plugin = gqlPlugin(options) as any;
  const transformHook = plugin.transform;
  const warnings: string[] = [];

  const context = {
    warn(message: string) {
      warnings.push(String(message));
    },
    error(message: string): never {
      throw new Error(String(message));
    },
  };

  const result = await transformHook.handler.call(context, code, id);
  return { result, warnings, filter: transformHook.filter };
};

describe("rollup test suite", () => {
  for (const folder of folders) {
    it(folder, async () => {
      await assertFixtureOutput(folder, transformWithRollup);
    });
  }
});

describe("rolldown test suite", () => {
  for (const folder of folders) {
    it(folder, async () => {
      await assertFixtureOutput(folder, transformWithRolldown);
    });
  }
});

describe("error reporting", () => {
  it("fails build for rollup when onError is error", async () => {
    const input = join(fixturesDir, "leaves file alone for literal interpolation expression", "input.js");

    await expect(async () => {
      const bundle = await rollup({
        input,
        treeshake: false,
        external: () => true,
        plugins: [gqlPlugin({ onError: "error" })],
      });
      await bundle.generate({
        format: "es",
        exports: "auto",
      });
    }).rejects.toThrow("Unsupported interpolation expression type: Literal");
  });

  it("fails build for rolldown when onError is error", async () => {
    const input = join(fixturesDir, "leaves file alone for literal interpolation expression", "input.js");

    await expect(async () => {
      const bundle = await rolldown({
        input,
        treeshake: false,
        external: () => true,
        plugins: [gqlPlugin({ onError: "error" })],
      });
      await bundle.generate({
        format: "esm",
        exports: "auto",
        polyfillRequire: false,
      });
    }).rejects.toThrow("Unsupported interpolation expression type: Literal");
  });

  it("includes supported interpolation types in warning diagnostics", async () => {
    const input = join(fixturesDir, "leaves file alone for unsupported interpolation expression", "input.js");
    const warnings: string[] = [];

    const bundle = await rollup({
      input,
      treeshake: false,
      external: () => true,
      onwarn(warning) {
        warnings.push(warning.message);
      },
      plugins: [gqlPlugin({ onError: "warn" })],
    });

    await bundle.generate({
      format: "es",
      exports: "auto",
    });

    expect(
      warnings.some((warning) =>
        warning.includes("Supported types: Identifier, MemberExpression, ChainExpression."),
      ),
    ).toBe(true);
  });
});

describe("direct transform contract", () => {
  it("builds a default code filter regex", async () => {
    const { filter } = await runDirectTransform("const x = 1;");
    expect(filter?.code).toBeInstanceOf(RegExp);
    expect(filter?.code?.test("gql`query Foo { bar }`")).toBe(true);
  });

  it("returns sourcemap for changed code", async () => {
    const { result } = await runDirectTransform(
      'import { gql } from "@apollo/client";\nconst q = gql`query Foo { bar }`;',
    );
    expect(result).toBeDefined();
    expect(result.map).not.toBeNull();
  });

  it("returns null sourcemap for unchanged code", async () => {
    const { result } = await runDirectTransform('const q = "no gql tag here";');
    expect(result).toBeDefined();
    expect(result.map).toBeNull();
  });

  it("returns null sourcemap and warns for unsupported interpolation", async () => {
    const { result, warnings } = await runDirectTransform(
      'import { gql } from "@apollo/client";\nconst q = gql`query Foo { bar } ${1}`;',
      "/virtual/unsupported-interpolation.js",
      { onError: "warn" },
    );
    expect(result).toBeDefined();
    expect(result.map).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });
});
