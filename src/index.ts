import type { TransformPluginContext } from "rollup";
import type { Plugin, PluginOption } from "vite";
import { parseAndWalk, ScopeTracker, type ScopeTrackerNode } from "oxc-walker";
import { stripIgnoredCharacters, type DocumentNode } from "graphql";
import { print } from "esrap";
import ts from "esrap/languages/ts";
import type { Expression, VariableDeclarator, TaggedTemplateExpression, Node } from "@oxc-project/types";
import gql from "graphql-tag";
import MagicString from "magic-string";
import { createHash } from "node:crypto";

const visitors = ts();

const uniqueFn = `(defs) => {
  const seen = new Set();
  return defs.filter((d) => {
    if (d.kind !== "FragmentDefinition") return true;
    const n = d.name?.value;
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}`;

const NORMALIZE_REGEX = /\\/g;

const normalizedCwd = process.cwd().replace(NORMALIZE_REGEX, "")
const cwdPrefix = `${normalizedCwd}/`;

const normalizeModuleId = (id: string) => {
  const normalizedId = id.replace(NORMALIZE_REGEX, "/");
  return normalizedId.startsWith(cwdPrefix) ? normalizedId.slice(cwdPrefix.length) : normalizedId
}

function generateHelper(id: string) {
  return "_unique_" + createHash("sha256").update(normalizeModuleId(id)).digest("hex").slice(0, 12);
}


const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Matches regex metacharacters so user-provided tag names are treated as literals.
const REGEX_META_CHARS = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (input: string): string => input.replace(REGEX_META_CHARS, "\\$&");

// Rust-side prefilter for likely tagged templates:
// - `(?:^|[^\\w$])` start of string or non-identifier char before tag identifier
// - `(?:...)` non-capturing alternation for configured identifiers
// - `\\s*` allow whitespace between tag and template literal
// - `` ` `` require tagged template shape
const buildCodeFilterRegex = (identifiers?: string[]): RegExp | undefined => {
  if (!identifiers?.length) return undefined;
  const escapedTagIdentifiers = identifiers.map(escapeRegex);
  return new RegExp(`(?:^|[^\\w$])(?:${escapedTagIdentifiers.join("|")})\\s*\``);
};

function printExpression(expr: Node, allowLiteral = false): string {
  switch (expr.type) {
    case "Identifier":
      return expr.name;

    case "ChainExpression":
      return printExpression(expr.expression);

    case "MemberExpression": {
      const obj = printExpression(expr.object);
      const prop = printExpression(expr.property, expr.computed);

      if (expr.computed) {
        return `${obj}${expr.optional ? "?.[" : "["}${prop}]`;
      }

      return `${obj}${expr.optional ? "?" : ""}.${prop}`;
    }

    case "Literal":
      if (!allowLiteral) {
        throw new Error("Unsupported expression type: Literal");
      }
      return JSON.stringify(expr.value);

    default:
      throw new Error("Unsupported expression type: " + expr.type);
  }
}

const getScopeTrackerNodeKey = (node: ScopeTrackerNode): string => {
  return `${node.type}:${node.scope}:${node.start}:${node.end}`;
};

type ExtractFilter<T> = T extends { filter?: infer F } ? F : never;

type Filter = ExtractFilter<Plugin["transform"]>;

interface Options {
  importSources?: string[];
  gqlTagIdentifiers?: string[];
  strip?: boolean;
  onlyMatchImportSuffix?: boolean;
  onError?: "warn" | "error";
  filter?: Filter;
}

const defaultOptions: Options = {
  importSources: ["graphql-tag", "@apollo/client"],
  gqlTagIdentifiers: ["gql"],
  strip: false,
  onlyMatchImportSuffix: false,
  onError: "warn",
};

const isRelevantVariableDeclarator = (
  declarator: Node | undefined | null,
  uniqueImportSources: Set<string>,
  onlyMatchImportSuffix: boolean,
): declarator is VariableDeclarator => {
  if (declarator?.type !== "VariableDeclarator") return false;
  if (declarator.init?.type !== "CallExpression") return false;
  // If the callee isn't `require(...)`, its's not what we want
  if (declarator.init.callee.type !== "Identifier" || declarator.init.callee.name !== "require") return false;
  const maybeModuleName = declarator.init.arguments[0];
  if (maybeModuleName?.type !== "Literal") return false;
  if (typeof maybeModuleName.value !== "string") return false;
  if (!onlyMatchImportSuffix) return uniqueImportSources.has(maybeModuleName.value);
  for (const suffix of uniqueImportSources) {
    if (maybeModuleName.value.endsWith(suffix)) return true;
  }
  return false;
};

const PURE_ANNOTATION = "/* @__PURE__ */";
const DEFINITIONS_SENTINEL = "__GQL_DEFS_SENTINEL__";
const QUOTED_DEFINITIONS_SENTINEL = JSON.stringify(DEFINITIONS_SENTINEL);
const SUPPORTED_INTERPOLATION_EXPRESSION_TYPES = new Set(["Identifier", "MemberExpression", "ChainExpression"]);
const SUPPORTED_INTERPOLATION_EXPRESSION_TYPES_DESCRIPTION = "Identifier, MemberExpression, ChainExpression";

const buildDefinitionsExpression = (
  definitions: DocumentNode["definitions"],
  interpolations: Expression[],
  uid?: string,
): string => {
  const stringifiedDefinitions = JSON.stringify(definitions);
  if (interpolations.length === 0) return stringifiedDefinitions;
  if (!uid) throw new Error("Missing helper id for interpolated GraphQL template.");

  // Enforce interpolation contract while serializing expressions.
  const interpolationDefinitions: string[] = [];
  for (const interpolation of interpolations) {
    if (!SUPPORTED_INTERPOLATION_EXPRESSION_TYPES.has(interpolation.type)) {
      throw new Error(
        `Unsupported interpolation expression type: ${interpolation.type}. Supported types: ${SUPPORTED_INTERPOLATION_EXPRESSION_TYPES_DESCRIPTION}.`,
      );
    }
    interpolationDefinitions.push(`${printExpression(interpolation)}.definitions`);
  }

  return `${PURE_ANNOTATION}${uid}(${PURE_ANNOTATION}${stringifiedDefinitions}.concat(${interpolationDefinitions.join(", ")}))`;
};

const serializeDocumentNode = (document: DocumentNode, expressions: Expression[], uid?: string): [string, boolean] => {
  const hasInterpolations = expressions.length > 0;
  const loc = document.loc?.source
    ? {
        ...document.loc,
        // `loc.source` contains a Source object; deep clone to keep output JSON-serializable.
        source: JSON.parse(JSON.stringify(document.loc.source)),
      }
    : document.loc;

  const serializable = {
    ...document,
    definitions: DEFINITIONS_SENTINEL,
    loc,
  };
  const definitionsExpression = buildDefinitionsExpression(document.definitions, expressions, uid);
  return [JSON.stringify(serializable).replace(QUOTED_DEFINITIONS_SENTINEL, definitionsExpression), hasInterpolations];
};

const compile = (node: TaggedTemplateExpression, options: Options, uid?: string): [string, boolean] => {
  let source = "";
  for (const quasi of node.quasi.quasis) source += quasi.value.raw;
  const queryDocument: DocumentNode = gql(options.strip ? stripIgnoredCharacters(source) : source);

  if (queryDocument.definitions.length > 1) {
    for (const definition of queryDocument.definitions) {
      if (!("name" in definition) || !definition.name) {
        throw new Error("GraphQL query must have a name.");
      }
    }
  }

  return serializeDocumentNode(queryDocument, node.quasi.expressions, uid);
};

function transform(ctx: TransformPluginContext, id: string, code: string, options: Options) {
  let hasError = false;
  let uniqueUsed = false;

  const magic = new MagicString(code);
  const uniqueImportSources = new Set<string>(options.importSources);
  const uniqueGqlTagIdentifiers = new Set<string>(options.gqlTagIdentifiers);
  const onlyMatchImportSuffix = options.onlyMatchImportSuffix === true;
  const isAllowedImportSource = (source: string): boolean => {
    if (!onlyMatchImportSuffix) return uniqueImportSources.has(source);
    for (const suffix of uniqueImportSources) {
      if (source.endsWith(suffix)) return true;
    }
    return false;
  };
  const toDelete = new Set<Node>();
  const touchedImportDeclarations = new Set<Node>();
  const touchedRequireDeclarators = new Set<Node>();
  // Tracks declarations in scope as we walk, so we can compare identifier bindings (not just names).
  const scopeTracker = new ScopeTracker();
  // For each tracked tag name (e.g. `gql`), store declaration keys that are valid transform targets.
  const trackedTagBindingKeys = new Map<string, Set<string>>();
  const stack: Node[] = [];
  let uid: string | undefined;
  const trackTagBinding = (name: string) => {
    const declaration = scopeTracker.getDeclaration(name);
    if (!declaration) return;
    let keys = trackedTagBindingKeys.get(name);
    if (!keys) {
      keys = new Set<string>();
      trackedTagBindingKeys.set(name, keys);
    }
    keys.add(getScopeTrackerNodeKey(declaration));
  };



  const res = parseAndWalk(code, id, {
    scopeTracker,
    leave(node) {
      stack.pop();

      if ((node.type === "ImportSpecifier" || node.type === "ImportDefaultSpecifier") && toDelete.has(node)) {
        this.remove();
      }

      // Remove the entire import declaration if it has no specifiers left.
      if (node.type === "ImportDeclaration" && touchedImportDeclarations.has(node)) {
        if (node.specifiers.length === 0) {
          magic.remove(node.start, node.end);
        } else {
          const code = print(node, visitors);
          magic.update(node.start, node.end, code.code);
        }
      }

      if (node.type === "Property" && node.value.type === "Identifier" && toDelete.has(node)) {
        this.remove();
      }
      if (
        node.type === "VariableDeclarator" &&
        touchedRequireDeclarators.has(node) &&
        node.id.type === "ObjectPattern"
      ) {
        if (node.id.properties.length === 0) {
          this.remove();
        } else {
          const code = print(node, visitors);
          magic.update(node.start, node.end, code.code);
        }
      }

      if (node.type === "VariableDeclaration" && node.declarations.length === 0) {
        magic.remove(node.start, node.end);
      }
    },
    enter(node, parent) {
      stack.push(node);

      if (node.type === "ImportSpecifier" && node.imported.type === "Identifier") {
        if (parent?.type !== "ImportDeclaration") return;
        if (!isAllowedImportSource(parent.source.value)) return;
        if (uniqueGqlTagIdentifiers.has(node.imported.name)) {
          trackTagBinding(node.imported.name);
          toDelete.add(node);
          touchedImportDeclarations.add(parent);
        }
      }

      if (node.type === "ImportDefaultSpecifier") {
        if (parent?.type !== "ImportDeclaration") return;
        if (!isAllowedImportSource(parent.source.value)) return;
        trackTagBinding(node.local.name);
        toDelete.add(node);
        touchedImportDeclarations.add(parent);
      }

      if (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        isRelevantVariableDeclarator(node, uniqueImportSources, onlyMatchImportSuffix)
      ) {
        trackTagBinding(node.id.name);
        this.remove();
      }

      if (node.type === "Property" && node.value.type === "Identifier") {
        if (!uniqueGqlTagIdentifiers.has(node.value.name)) return;
        const declarator = stack.at(-3);
        if (!isRelevantVariableDeclarator(declarator, uniqueImportSources, onlyMatchImportSuffix)) return;
        trackTagBinding(node.value.name);
        toDelete.add(node);
        touchedRequireDeclarators.add(declarator);
      }

      // Transform only when this identifier resolves to one of our tracked gql bindings.
      // This avoids false positives when `gql` is shadowed by local declarations.
      if (node.type === "TaggedTemplateExpression" && node.tag.type === "Identifier") {
        const bindingKeys = trackedTagBindingKeys.get(node.tag.name);
        if (!bindingKeys) return;
        const currentDeclaration = scopeTracker.getDeclaration(node.tag.name);
        if (!currentDeclaration || !bindingKeys.has(getScopeTrackerNodeKey(currentDeclaration))) return;

        const maybeUid = node.quasi.expressions.length > 0 ? (uid ??= generateHelper(id)) : undefined;
        try {
          const [compiled, used] = compile(node, options, maybeUid);
          uniqueUsed = uniqueUsed || used;
          magic.update(node.start, node.end, compiled);
          this.skip();
        } catch (error) {
          const message = getErrorMessage(error);
          if (options.onError === "error") {
            ctx.error(message);
          } else {
            ctx.warn(message);
          }
          hasError = true;
        }
        return;
      }
    },
  });

  if (!res || hasError || !magic.hasChanged()) return { code, map: null };

  if (uniqueUsed && uid && res.program.type === "Program") {
    const insertionPos = res.module.staticImports.at(-1)?.end ?? 0;
    magic.appendLeft(insertionPos, `const ${uid} = ${uniqueFn};\n`);
  }

  const printed = magic.toString();
  const sourceMap = magic.generateMap({ hires: true });

  return {
    code: printed,
    map: sourceMap,
  };
}

export function gqlPlugin(optionsProp: Options = {}): PluginOption {
  const gqlTagIdentifiers = optionsProp.gqlTagIdentifiers ?? defaultOptions.gqlTagIdentifiers;
  const options: Options = {
    importSources: optionsProp.importSources ?? defaultOptions.importSources,
    gqlTagIdentifiers,
    strip: optionsProp.strip ?? defaultOptions.strip,
    onlyMatchImportSuffix: optionsProp.onlyMatchImportSuffix ?? defaultOptions.onlyMatchImportSuffix,
    onError: optionsProp.onError ?? defaultOptions.onError,
  };
  return {
    name: "gql-plugin",
    transform: {
      filter: {
        id: optionsProp.filter?.id,
        code: optionsProp.filter?.code ?? buildCodeFilterRegex(gqlTagIdentifiers),
      },
      handler(code, id) {
        return transform(this, id, code, options);
      },
    },
  };
}

export default gqlPlugin;
