const fetch = require('node-fetch');
const path = require('path')
const {store,config,themes} = require(path.join(__dirname,"Pages/Resources/store"))
var bus //Event Bus Def
/**
 * Neos API Endpoints
 */
const CLOUDX_PRODUCTION_NEOS_API = "https://cloudx.azurewebsites.net/";
const CLOUDX_STAGING_NEOS_API = "https://cloudx-staging.azurewebsites.net/";
const CLOUDX_NEOS_BLOB = "https://cloudxstorage.blob.core.windows.net/";
const CLOUDX_NEOS_CDN = "https://cloudx.azureedge.net/";
const LOCAL_NEOS_API = "http://localhost:60612";
const LOCAL_NEOS_BLOB = "http://127.0.0.1:10000/devstoreaccount1/";


class Neos {
    constructor(machineID){
        this._machineID = machineID
    }
}
module.exports = function (b) {
	bus = b;
	return {
		Neos
	}
}