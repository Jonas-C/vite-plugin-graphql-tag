const _unique_16730e5ce180 = (defs) => {
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
        name: { kind: 'Name', value: 'DotBarFragment' },
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
      end: 56,
      source: {
        body: '\n    fragment DotBarFragment on Bar {\n      bar\n    }\n  ',
        name: 'GraphQL request',
        locationOffset: { line: 1, column: 1 },
      },
    },
  },
};

const query = {
  kind: 'Document',
  definitions: /* @__PURE__ */ _unique_16730e5ce180(
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
              name: { kind: 'Name', value: 'DotBarFragment' },
              directives: [],
            },
          ],
        },
      },
    ].concat(fragments.barFragment.definitions),
  ),
  loc: {
    start: 0,
    end: 44,
    source: {
      body: '\n  query foo {\n    ...DotBarFragment\n  }\n  \n',
      name: 'GraphQL request',
      locationOffset: { line: 1, column: 1 },
    },
  },
};

