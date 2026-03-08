import { gql } from "@apollo/client";

const fragments = {
  barFragment: gql`
    fragment DotBarFragment on Bar {
      bar
    }
  `,
};

const query = gql`
  query foo {
    ...DotBarFragment
  }
  ${fragments.barFragment}
`;
