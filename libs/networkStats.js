var fs = require('fs');
var request = require('request');
var redis = require('redis');
var Stratum = require('stratum-pool');
var Pay = require('./paymentProcessor.js')
const loggerFactory = require('./logger.js');

var poolConfigs = JSON.parse(process.env.pools);

var poolOptions = Pay.poolConfigs[coin];

function cacheStats () {
		var coin = poolOptions.coin.name;
		var processingConfig = poolOptions.paymentProcessing;
		let logger = loggerFactory.getLogger('PaymentProcessing', 'system');
		var daemon = new Stratum.daemon.interface([processingConfig.daemon], loggerFactory.getLogger('CoinDaemon', coin));
        var params = null;
		var redisClient = redis.createClient(poolOptions.redis.port, poolOptions.redis.host);
		// redis auth if enabled
	    if (poolOptions.redis.password) {
		    redisClient.auth(poolOptions.redis.password);
			}
        daemon.cmd('getmininginfo', params,
            function (result) {                
                if (!result || result.error || result[0].error || !result[0].response) {
                    logger.debug(logSystem, logComponent, 'Error with RPC call getmininginfo '+JSON.stringify(result[0].error));
                    return;
                }
                
                var coin = logComponent;
                var finalRedisCommands = [];
                
                if (result[0].response.blocks !== null) {
                    finalRedisCommands.push(['hset', coin + ':stats', 'networkBlocks', result[0].response.blocks]);
                }
                if (result[0].response.difficulty !== null) {
                    finalRedisCommands.push(['hset', coin + ':stats', 'networkDiff', result[0].response.difficulty]);
                }
                if (result[0].response.networkhashps !== null) {
                    finalRedisCommands.push(['hset', coin + ':stats', 'networkHashps', result[0].response.networkhashps]);
                }

                daemon.cmd('getnetworkinfo', params,
                    function (result) {
                        if (!result || result.error || result[0].error || !result[0].response) {
                            logger.debug(logSystem, logComponent, 'Error with RPC call getnetworkinfo '+JSON.stringify(result[0].error));
                            return;
                        }
                        
                        if (result[0].response.connections !== null) {
                            finalRedisCommands.push(['hset', coin + ':stats', 'networkConnections', result[0].response.connections]);
                        }
                        if (result[0].response.version !== null) {
                            finalRedisCommands.push(['hset', coin + ':stats', 'networkVersion', result[0].response.version]);
                        }
                        if (result[0].response.subversion !== null) {
                            finalRedisCommands.push(['hset', coin + ':stats', 'networkSubVersion', result[0].response.subversion]);
                        }
                        if (result[0].response.protocolversion !== null) {
                            finalRedisCommands.push(['hset', coin + ':stats', 'networkProtocolVersion', result[0].response.protocolversion]);
                        }

                        if (finalRedisCommands.length <= 0)
                            return;

                        redisClient.multi(finalRedisCommands).exec(function(error, results){
                            if (error){
                                logger.debug(logSystem, logComponent, 'Error with redis during call to cacheNetworkStats() ' + JSON.stringify(error));
                                return;
                            }
                        });
                    }
                );
            }
        );
    }

module.exports.cacheStats = cacheStats;
