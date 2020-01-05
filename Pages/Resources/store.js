const Store = require('electron-store');
let configs = {
	store:{
		name: 'DATA',
		fileExtension: "",
		encryptionKey:require('root-require')('package.json').version
	
	},
	config:{
		name: 'config',
		defaults: {
			lang: 'en'
		}
	},
	themes:{
		name: 'themes'
	}
}

if (process.argv.indexOf("--config")>-1){
	configs.store.cwd = configs.config.cwd = configs.themes.cwd = process.argv[process.argv.indexOf("--config")+1]
	console.log(`Loading config from ${configs.store.cwd}`)
}

/**
 * General Data Store
 */
const store = new Store(configs.store);
/**
 * App Config Store
 */
const config = new Store(configs.config);
/**
 * Themes Store
 */
const themes = new Store(configs.themes);
module.exports = {store,config,themes}