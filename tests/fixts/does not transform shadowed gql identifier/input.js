import { gql } from "@apollo/client";

function makeQuery(gql) {
  return gql`
    query fromArg {
      bar
    }
  `;
}

const query = gql`
  query root {
    baz
  }
`;

export { makeQuery, query };
