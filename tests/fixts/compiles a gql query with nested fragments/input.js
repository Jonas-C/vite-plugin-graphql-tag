import { gql } from "graphql-tag";

const root = gql`
  query foo {
    ...BarFragment
  }
  ${BarFragment}
`;

const BarFragment = gql`
  fragment BarFragment on FooType {
    bar
    ...BazFragment
  }
  ${BazFragment}
`;

const BazFragment = gql`
  fragment BazFragment on BazType {
    baz
  }
`;
