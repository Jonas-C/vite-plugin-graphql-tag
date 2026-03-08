const _unique_ee08cf1cf11e = (defs) => {
  const seen = new Set();
  return defs.filter((d) => {
    if (d.kind !== "FragmentDefinition") return true;
    const n = d.name?.value;
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
};

const query = {
  kind: "Document",
  definitions: /* @__PURE__ */ _unique_ee08cf1cf11e(
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
    ].concat(barFragment.definitions),
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

const barFragment = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "BarFragment" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Bar" } },
      directives: [],
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "bar" }, arguments: [], directives: [] }],
      },
    },
  ],
  loc: {
    start: 0,
    end: 45,
    source: {
      body: "\n  fragment BarFragment on Bar {\n    bar\n  }\n",
      name: "GraphQL request",
      locationOffset: { line: 1, column: 1 },
    },
  },
};
