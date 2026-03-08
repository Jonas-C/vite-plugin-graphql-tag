const _unique_a47deacb5626 = (defs) => {
  const seen = new Set();
  return defs.filter((d) => {
    if (d.kind !== "FragmentDefinition") return true;
    const n = d.name?.value;
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
};

const root = {
  kind: "Document",
  definitions: /* @__PURE__ */ _unique_a47deacb5626(
    /* @__PURE__ */ [
      {
        kind: "OperationDefinition",
        operation: "query",
        name: { kind: "Name", value: "foo" },
        variableDefinitions: [],
        directives: [],
        selectionSet: {
          kind: "SelectionSet",
          selections: [
            {
              kind: "FragmentSpread",
              name: { kind: "Name", value: "BarFragment" },
              directives: [],
            },
          ],
        },
      },
    ].concat(BarFragment.definitions),
  ),
  loc: {
    start: 0,
    end: 41,
    source: {
      body: "\n  query foo {\n    ...BarFragment\n  }\n  \n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};

const BarFragment = {
  kind: "Document",
  definitions: /* @__PURE__ */ _unique_a47deacb5626(
    /* @__PURE__ */ [
      {
        kind: "FragmentDefinition",
        name: { kind: "Name", value: "BarFragment" },
        typeCondition: { kind: "NamedType", name: { kind: "Name", value: "FooType" } },
        directives: [],
        selectionSet: {
          kind: "SelectionSet",
          selections: [
            { kind: "Field", name: { kind: "Name", value: "bar" }, arguments: [], directives: [] },
            {
              kind: "FragmentSpread",
              name: { kind: "Name", value: "BazFragment" },
              directives: [],
            },
          ],
        },
      },
    ].concat(BazFragment.definitions),
  ),
  loc: {
    start: 0,
    end: 71,
    source: {
      body: "\n  fragment BarFragment on FooType {\n    bar\n    ...BazFragment\n  }\n  \n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};

const BazFragment = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "BazFragment" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "BazType" } },
      directives: [],
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "baz" }, arguments: [], directives: [] }],
      },
    },
  ],
  loc: {
    start: 0,
    end: 49,
    source: {
      body: "\n  fragment BazFragment on BazType {\n    baz\n  }\n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};
