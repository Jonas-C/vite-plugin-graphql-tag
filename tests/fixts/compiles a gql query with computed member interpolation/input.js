import { gql } from "@apollo/client";

const fragments = {
  barFragment: gql`
    fragment ComputedBarFragment on Bar {
      bar
    }
  `,
};

const query = gql`
  query foo {
    ...ComputedBarFragment
  }
  ${fragments["barFragment"]}
`;
