'use strict';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

// Field IDs are resolved by name at query time (not hardcoded) so the script
// survives the Status/Iteration fields being recreated on the project board.
const QUERY = `
  query($owner: String!, $number: Int!, $itemsCursor: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        statusField: field(name: "Status") {
          ... on ProjectV2SingleSelectField { id name }
        }
        iterationField: field(name: "Iteration") {
          ... on ProjectV2IterationField {
            id
            name
            configuration {
              iterations { id title startDate duration }
            }
          }
        }
        items(first: 100, after: $itemsCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            iteration: fieldValueByName(name: "Iteration") {
              ... on ProjectV2ItemFieldIterationValue { iterationId }
            }
          }
        }
      }
    }
  }
`;

async function fetchProjectData({ owner, number, token }) {
  const items = [];
  let iterationField = null;
  let itemsCursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: QUERY, variables: { owner, number, itemsCursor } }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`GitHub GraphQL errors: ${payload.errors.map((error) => error.message).join('; ')}`);
    }

    const project = payload.data?.user?.projectV2;
    if (!project) {
      throw new Error(`Project #${number} not found for owner "${owner}"`);
    }
    if (!project.statusField) {
      throw new Error('Project is missing the required "Status" field');
    }
    if (!project.iterationField) {
      throw new Error('Project is missing the required "Iteration" field');
    }
    iterationField = project.iterationField;

    for (const node of project.items.nodes) {
      items.push({
        status: node.status?.name ?? null,
        iterationId: node.iteration?.iterationId ?? null,
      });
    }

    hasNextPage = project.items.pageInfo.hasNextPage;
    itemsCursor = project.items.pageInfo.endCursor;
  }

  return {
    iterations: iterationField.configuration.iterations,
    items,
  };
}

module.exports = { fetchProjectData, QUERY };
