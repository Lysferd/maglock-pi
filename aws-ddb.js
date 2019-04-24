
const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const TableName = 'maglock-door-';
const GetMAC = require('getmac');

// Stupid workaround:
function getUUID(callback) {
  GetMAC.getMac(function(err, mac) {
    if (err) throw err
    uuid = TableName + mac.replace(/:/g, '');
    callback(uuid);
  });
};

getUUID(function(uuid) {
  console.log('My UUID is:', uuid);

  DDB.begin = function() {
    DDB.describeTable({ TableName: uuid }, function(err, data) {
      if (err) {
        console.log('[DDB Warning]: AWS DynamicDB table could not be found. Table will be created anew.');

        const params = {
          TableName: uuid,
          KeySchema: [ { 'AttributeName': 'date', 'KeyType': 'HASH' } ],
          AttributeDefinitions: [ { 'AttributeName': 'date', 'AttributeType': 'S' } ],
          ProvisionedThroughput: { 'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5 }
        };

        DDB.createTable(params, function(err, data) {
          if (err)
            console.log('[DDB Error]: Could not create table! ', err, err.stack);
          else
            console.log('[DDB Success]: Table created! ', data);
        });
      }
      else console.log(data)
    });
  };

  // DDB Log
  DDB.log = function(message, type) {
    var params = {
      TableName: uuid,
      Item: {
        'date'  : { S: new Date().toISOString() },
        'event' : { S: message },
        'type'  : { S: type }
      }
    };

    DDB.waitFor('tableExists', { TableName: uuid }, function(err, data) {
      DDB.putItem(params, function(err, data) {
        if (err) {
          console.log('[DDB Error]: putItem ', err);
        } else {
          console.log('[DDB Success]: putItem ', data);
        }
      });
    });
  };
});

module.exports = DDB;
