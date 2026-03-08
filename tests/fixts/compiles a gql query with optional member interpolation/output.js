const _unique_c03cd7ca6c77 = (defs) => {
  const seen = new Set();
  return defs.filter((d) => {
    if (d.kind !== 'FragmentDefinition') return true;
    const n = d.name?.value;
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
};

const fragments = {
  barFragment: {
    kind: 'Document',
    definitions: [
      {
        kind: 'FragmentDefinition',
        name: { kind: 'Name', value: 'OptionalBarFragment' },
        typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Bar' } },
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            { kind: 'Field', name: { kind: 'Name', value: 'bar' }, arguments: [], directives: [] },
          ],
        },
      },
    ],
    loc: {
      start: 0,
      end: 61,
      source: {
        body: '\n    fragment OptionalBarFragment on Bar {\n      bar\n    }\n  ',
        name: 'GraphQL request',
        locationOffset: { line: 1, column: 1 },
      },
    },
  },
};

const query = {
  kind: 'Document',
  definitions: /* @__PURE__ */ _unique_c03cd7ca6c77(
    /* @__PURE__ */ [
      {
        kind: 'OperationDefinition',
        operation: 'query',
        name: { kind: 'Name', value: 'foo' },
        variableDefinitions: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'FragmentSpread',
              name: { kind: 'Name', value: 'OptionalBarFragment' },
              directives: [],
            },
          ],
        },
      },
    ].concat(fragments?.barFragment.definitions),
  ),
  loc: {
    start: 0,
    end: 49,
    source: {
      body: '\n  query foo {\n    ...OptionalBarFragment\n  }\n  \n',
      name: 'GraphQL request',
      locationOffset: { line: 1, column: 1 },
    },
  },
};

