import gql, { resetCaches } from "graphql-tag";

const query = gql`
  query foo {
    bar
  }
`;

resetCaches();
