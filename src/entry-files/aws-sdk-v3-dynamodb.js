const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
module.exports = { DynamoDBClient, DynamoDBDocumentClient, GetCommand, PutCommand }
