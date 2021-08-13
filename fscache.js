const fetch = /*require("@zeit/fetch-retry")*/(require("node-fetch"));
const fetchConfig = {headers: {"User-Agent": "npm2neo4j (+ @programmer5000 https://github.com/programmer5000-com/npm2neo4j)"}};
const {AbortController} = require("abort-controller");
const path = require("path");
const fs = require("fs");
const util = require("util");
const mkdirPromise = util.promisify(fs.mkdir);
const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);

const numSubfolders = 2;
const fileExtension = ".json";
const prefix = "cache";
const procString = (str) => {
	let arr = [];
	for(let i = 0; i < numSubfolders; i++){
		if(numSubfolders > str.length) break;
		arr.push(str.slice(0, numSubfolders));
		str = str.slice(numSubfolders);
	}
	return {arr, str};
};
const undoString = (path) => path.slice(0, -5).replace(/[/\\]+/g, "");

const eexist = e => e.code === "EEXIST" ? Promise.resolve() : Promise.reject(e);
const init = async () => {
	await mkdirPromise(prefix).catch(eexist);
};
exports.init = init;

const getFileLocation = async file => {
	const {arr, str} = procString(file);
	let filePath = prefix + path.sep;
	for(let i = 0; i < arr.length ; i ++){
		const folder = filePath + arr[i] + path.sep;
		await mkdirPromise(folder).catch(eexist);
		filePath = folder;
	}
	filePath += str + fileExtension;
	return filePath;
};
exports.getFileLocation = getFileLocation;

const readJSON = async file => {
	const location = await getFileLocation(file);
	try{
		return JSON.parse((await readFilePromise(location)).toString());
	}catch(e){
		return undefined;
	}
};
exports.readJSON = readJSON;

const writeJSON = async (file, json) => {
	if(typeof json !== "string") json = JSON.stringify(json);
	const location = await getFileLocation(file);
	await writeFilePromise(location, json);
	return;
};
exports.writeJSON = writeJSON;

const getModule = async (moduleName) => {
	let hit = true;
	let data = await readJSON(encodeURIComponent(moduleName));
	if(!data){
		hit = false;
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			10000,
		);

		try {
			const req = fetch("https://skimdb.npmjs.com/registry/" + encodeURIComponent(moduleName), Object.assign(fetchConfig, {signal: controller.signal}));
			data = await (await req).json();
			await writeJSON(encodeURIComponent(moduleName), data);
		}catch(e){
			if (e.name === "AbortError") {
				console.error(`${moduleName} Request timed out!`);
			}else{
				throw e;
			}
		}finally{
			clearTimeout(timeout);
		}

	}
	return {data, cacheHit: hit};
};
exports.getModule = getModule;
