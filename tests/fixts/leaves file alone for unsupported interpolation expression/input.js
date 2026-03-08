import { gql } from "@apollo/client";

const BarFragment = gql`
  fragment BarFragment on Bar {
    bar
  }
`;

const query = gql`
  query foo {
    ...BarFragment
  }
  ${getBarFragment()}
`;
