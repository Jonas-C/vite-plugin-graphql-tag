import { gql } from "@apollo/client";

const query = gql`
  query foo {
    ...BarFragment
  }
  ${barFragment}
`;

const barFragment = gql`
  fragment BarFragment on Bar {
    bar
  }
`;
