
var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/gmXEVo5luMPUGPqg6mhy';
var INFURA_MAINNET_URL = 'https://mainnet.infura.io/gmXEVo5luMPUGPqg6mhy';


var https_enabled = process.argv[2] === 'https';
var test_mode = process.argv[2] === 'test';

var cluster = require('cluster')

const poolConfig = require('./pool.config').config

console.log(poolConfig)

console.log('init');

fs = require('fs');

var redisInterface = require('./lib/redis-interface')
var peerInterface = require('./lib/peer-interface')
var tokenInterface = require('./lib/token-interface')
var webInterface = require('./lib/web-interface')
var webServer =  require('./lib/web-server')
var diagnosticsManager =  require('./lib/diagnostics-manager')
var accountConfig;
var Web3 = require('web3')

var web3 = new Web3()

if(test_mode){
  console.log("Using test mode!!! - Ropsten ")
  web3.setProvider(INFURA_ROPSTEN_URL)

   accountConfig = require('./test.account.config').account;
}else{

  var specified_web3 = poolConfig.web3provider

   if(specified_web3 != null)
   {
     web3.setProvider(specified_web3)
     console.log('using web3',specified_web3)
   }else{
     web3.setProvider(INFURA_MAINNET_URL)
   }

   accountConfig = require('./account.config').account;
}


init(web3);


async function init(web3)
{


        // Code to run if we're in the master process
      if (cluster.isMaster) {

          // Count the machine's CPUs
        //  var cpuCount = require('os').cpus().length;

          // Create a worker for each CPU
          for (var i = 0; i < 2; i += 1) {
              cluster.fork();
          }


           await redisInterface.init()
           await webInterface.init(web3,accountConfig,poolConfig,redisInterface)
           await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,test_mode)
           await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,test_mode) //initJSONRPCServer();
           await webServer.init(https_enabled,webInterface,peerInterface)
           await diagnosticsManager.init(redisInterface,webInterface,peerInterface)


      // Code to run if we're in a worker process
      } else {
        var worker_id = cluster.worker.id


            if(worker_id == 1)
            {
               await redisInterface.init()
               await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,test_mode)


               await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,test_mode) //initJSONRPCServer();
               tokenInterface.update();
               peerInterface.update();
            }
            if(worker_id == 2)
            {
              await redisInterface.init()
              await tokenInterface.init(redisInterface,web3,accountConfig,poolConfig,test_mode)
              await peerInterface.init(web3,accountConfig,poolConfig,redisInterface,tokenInterface,test_mode) //initJSONRPCServer();
              //tokenInterface.update();
              peerInterface.listenForJSONRPC();
            }
      }





}