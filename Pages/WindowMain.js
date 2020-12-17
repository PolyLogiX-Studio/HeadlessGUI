var document
const VERSION = require("root-require")("package.json").version;
const electron = require("electron");
const { ipcRenderer } = electron;
const path = require("path");
const { store, config, themes } = require(path.join(
  __dirname,
  "Resources/store"
));
require("./Resources/DOMEditing.js").setupThemes();
const {
  addElement,
  removeElement,
  replacejscssfile,
  newTheme,
} = require("./Resources/DOMEditing.js");
const fetch = require("node-fetch");
const LocalizedStrings = require("localized-strings").default;
var lang = ipcRenderer.sendSync("fetchLanguage");
var strings = new LocalizedStrings(lang, { pseudo: store.get("pseudo") });
strings.setLanguage(config.get("lang"));
function updateElementHTML(ID, value) {
  document.getElementById(ID).innerHTML = value;
}
function updateElementSrc(ID, value) {
  document.getElementById(ID).src = value;
}
module.exports = (doc)=>{document = doc;return {strings, updateElementHTML, updateElementSrc, fetch, addElement, removeElement, replacejscssfile, newTheme, ipcRenderer, VERSION, electron, store, themes}}