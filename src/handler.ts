import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyResult,
} from "aws-lambda";
import AWS, { AWSError } from 'aws-sdk'

type Action = "$connect" | '$disconnect' | 'getMessages' | 'sendMessage' | 'getClients'
const CLIENT_TABLE_NAME = 'Clients'
const responseOk = {
  statusCode: 200,
  body: ""
}
const docClient = new AWS.DynamoDB.DocumentClient()
const apiGw = new AWS.ApiGatewayManagementApi({
  endpoint: process.env["WSSAPIGATEWAYENDPOINT"]
})

export const handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const routeKey = event.requestContext.routeKey
  const connectionId = event.requestContext.connectionId as string

  switch (routeKey) {
    case "$connect":
      return handleConnect(connectionId, event.queryStringParameters)
    case "$disconnect":
      return handleDisconnect(connectionId)
    case "getClients":
      return handleGetClients(connectionId)
    default:
      return {
        statusCode: 500,
        body: ""
      }
  }

}

const handleDisconnect = async (
  connectionId: string,
): Promise<APIGatewayProxyResult> => {

  await docClient
    .delete(
      {
        TableName: CLIENT_TABLE_NAME
        , Key: {
          connectionId
        }
      }).promise()

  return responseOk
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
        TableName: CLIENT_TABLE_NAME,
        Item: {
          connectionId,
          nickname: queryParams["nickname"],
        }
      }).promise()

  return responseOk
}

const handleGetClients = async (
  connectionId: string): Promise<APIGatewayProxyResult> => {
  const output = await docClient
    .scan({
      TableName: CLIENT_TABLE_NAME
    })
    .promise()

  const clients = output.Items || []

  try {
    await apiGw.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(clients)
    })
      .promise()
  } catch (e) {
    if ((e as AWSError).statusCode !== 410) {
      throw e
    }

    await docClient
      .delete(
        {
          TableName: CLIENT_TABLE_NAME
          , Key: {
            connectionId
          }
        }).promise()
  }

  return responseOk
}
