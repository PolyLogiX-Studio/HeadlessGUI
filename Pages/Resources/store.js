const Store = require('electron-store');
/**
 * General Data Store
 */
const store = new Store({
    name: 'DATA',
    fileExtension: "",
    encryptionKey:require('root-require')('package.json').version

});
/**
 * App Config Store
 */
const config = new Store({
	name: 'config',
	defaults: {
		lang: 'en'
	}
});
/**
 * Themes Store
 */
const themes = new Store({
	name: 'themes'
});
module.exports = {store,config,themes}