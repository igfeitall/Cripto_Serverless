const AWS = require('aws-sdk')
const validation = require('../utils/validation')
const { chunks } = require('../utils/utils')

const dynamoClient = new AWS.DynamoDB.DocumentClient()
const TableName = process.env.TABLE_NAME
  

const getById = async (tokenId) => {
  const Limit = process.env.HISTORIC_LIMIT
  const params = {
      KeyConditionExpression: 'tokenId = :id',
      ExpressionAttributeValues: {
        ':id': tokenId
      },
      TableName,
      Limit,
      ScanIndexForward: false
    }

  return dynamoClient.query(params).promise()
}

const listAll = async () => {
  const params = {
    TableName
  }

  return dynamoClient.scan(params).promise()
}

const deleteById = async (tokenId) => {

  const queryParams = {
    KeyConditionExpression: 'tokenId = :id',
    ExpressionAttributeValues: { ':id': tokenId },
    TableName
  }

  const queryResults = await dynamoClient.query(queryParams).promise()
  console.log("querry result", queryResults)

  try {
    
    console.log(validation)
    console.log(validation.arrayExist);
    validation.arrayExist(queryResults.Item, tokenId)
    const batchCalls = chunks(queryResults.Items, 25).map( async (chunk) => {
      const deleteRequests = chunk.map( item => {
        return {
          DeleteRequest : {
            Key : {
              'tokenId' : item.tokenId,
              'timestamp' : item.timestamp,

            }
          }
        }
      })

      const batchWriteParams = {
        RequestItems : {
          [TableName] : deleteRequests
        }
      }

      const returnValue = await dynamoClient.batchWrite(batchWriteParams).promise()
      console.log(returnValue, 'deleted values');
      return returnValue
  })

  return Promise.all(batchCalls)
  } catch (err) {
    
    throw err
  }
}

const addItems = async (items) => {

  const batchCalls = chunks(items, 25).map( async () => {
    const PutRequests = items.map( (item) => {
      console.log(item);
      return {
        PutRequest: {
          Item: item
        }
      }
    })

    const batchWriteParams = {
      RequestItems: {
        [TableName]: PutRequests
      }
    }

    return await dynamoClient.batchWrite(batchWriteParams).promise()
  })

  return Promise.all(batchCalls)
}

module.exports = {getById, listAll, deleteById, addItems}