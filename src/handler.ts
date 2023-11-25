import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyResult,
} from "aws-lambda";
import AWS from 'aws-sdk'

type Action = "$connect" | '$disconnect' | 'getMessages' | 'sendMessage' | 'getClients'

const docClient = new AWS.DynamoDB.DocumentClient()

export const handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const routeKey = event.requestContext.routeKey
  const connectionId = event.requestContext.connectionId as string

  switch (routeKey) {
    case "$connect":
      return handleConnect(connectId, event.queryStringParameters)
    // case "$disconnect":
    // case "getClients":
    default:
      return {
        statusCode: 500,
        body: ""
      }
  }

}

const handleConnect = async (
  connectionId: string,
  queryParams: APIGatewayProxyEventQueryStringParameters | null
): Promise<APIGatewayProxyResult> => {
  if (!queryParams || !queryParams['nickname']) {
    return {
      statusCode: 403,
      body: ""
    }
  }

  await docClient
    .put(
      {
        TableName: "Clients",
        Item: {
          connectionId,
          nickname: queryParams["nickname"],
        }
      }).promise()

  return {
    statusCode: 200,
    body: ""
  }
}