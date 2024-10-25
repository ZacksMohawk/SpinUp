const prompt = require("prompt-sync")();
const fs = require("fs");
const path = require("path");
const Logger = require("./includes/Logger");


let version = "1.0.1";
let templateType;
let settings = {};
let maxFolderSize = 1000000;

// OS-specific variables
let pathDivider = '/';
let chosenOS = process.platform === "win32" ? 'Windows' : 'Mac';
if (chosenOS == 'Mac'){
	pathDivider = '/';
}
else if (chosenOS == 'Windows'){
	pathDivider = '\\';
}
else {
	Logger.log("Invalid OS Choice");
	Logger.log("Exiting");
	process.exit(0);
}

let ignoreTypeStore = {};
let ignoreTypeData = fs.readFileSync('.ignoreFileTypes', 'utf8').split('\n');
for (let index in ignoreTypeData){
	ignoreTypeStore[ignoreTypeData[index]] = 1;
}
let ignoreStore = {};
let ignoreStartsWithArray = [];
let ignoreEndsWithArray = [];
let targetFolder = null;

Logger.log();
Logger.log(fs.readFileSync('AppLogo.txt', 'utf8'));
Logger.log();
Logger.log('SpinUp v' + version);
Logger.log();

if (process.argv.indexOf("-template") != -1){
	// populate ignoreStore
	let ignoreData = fs.readFileSync('.ignore', 'utf8').split('\n');
	for (let index in ignoreData){
		let ignoreEntry = ignoreData[index];
		if (!ignoreEntry){
			continue;
		}
		if (ignoreEntry.startsWith('*')){
			ignoreEndsWithArray.push(ignoreEntry.replace('*', ''));
			continue;
		}
		if (ignoreEntry.endsWith('*')){
			ignoreStartsWithArray.push(ignoreEntry.replace('*', ''));
			continue;
		}
		ignoreStore[ignoreData[index]] = 1;
	}

	targetFolder = process.argv[process.argv.indexOf("-template") + 1];

	checkTargetFolderValidity(targetFolder);

	Logger.log();
	Logger.log('** CREATING TEMPLATE **');
	Logger.log();

	// get template name
	let templateName = prompt('Template name: ')
	if (!templateName){
		process.exit(0);
	}
	templateName = templateName.trim();

	let templatePath = __dirname + pathDivider + 'templates' + pathDivider + templateName;
	if (fs.existsSync(templatePath)){
		let overwrite = prompt("Overwrite existing template? (y/n): ");
		if (!overwrite){
			Logger.log("Exiting");
			process.exit(0);
		}
		overwrite = overwrite.trim().toLowerCase();
		if (overwrite != 'y'){
			Logger.log("Exiting");
			process.exit(0);
		}
		// delete the folder and continue with normal processing
		fs.rmSync(templatePath, { recursive: true, force: true });
	}

	let replacementPairs = {};
	getReplacementPair(replacementPairs);

	if (Object.keys(replacementPairs).length == 0){
		Logger.log("No replacement pairs set");
		Logger.log("Exiting");
		process.exit(0);
	}

	recursivelyCopyAndReplace(targetFolder, '', templatePath, replacementPairs);

	// create metadata file in template
	let metadata = {
		'displayName' : templateName,
		'replacementPairs' : replacementPairs
	};
	fs.writeFileSync(templatePath + pathDivider + 'SpinUp_metadata.json', JSON.stringify(metadata));

	Logger.log('Template "' + templateName + '" created at: ' + (templatePath));

	process.exit(0);
}

let folderPath;
if (process.argv.indexOf("-folderPath") != -1){
	folderPath = process.argv[process.argv.indexOf("-folderPath") + 1];
	if (!folderPath){
		Logger.log("No folderPath provided");
		Logger.log("Exiting");
		process.exit(0);
	}
}
else {
	Logger.log("No folderPath provided");
	Logger.log("Exiting");
	process.exit(0);
}

function recursivelyCopyAndReplace(item, path, outputTargetFolder, replacementPairs){
	item = path ? path + pathDivider + item : item;

	let stats = fs.statSync(item);
	let size = 0;

	if (stats.isDirectory()){
		let files = fs.readdirSync(item);
		for (let fileIndex = 0; fileIndex < files.length; fileIndex++){
			let file = files[fileIndex];
			if (ignoreStore[file]){
				continue;
			}
			if (startsWithMatchFound(file)){
				continue;
			}
			if (endsWithMatchFound(file)){
				continue;
			}
			recursivelyCopyAndReplace(file, item, outputTargetFolder, replacementPairs);
		}
	}
	else {
		let filename = item.substr(item.lastIndexOf('/') + 1, item.length);
		if (filename == 'SpinUp_metadata.json'){
			return;
		}
		let replacedFilename = replaceAllKeys(filename, replacementPairs, true);
		let fileType = filename.substr(filename.lastIndexOf('.'), filename.length);
		let relativePath = item.replace(targetFolder + pathDivider, '').replace(filename, '');

		let destinationFolder = outputTargetFolder + (relativePath ? pathDivider + relativePath : '');
		if (!fs.existsSync(destinationFolder)){
			fs.mkdirSync(destinationFolder, { recursive: true });
		}

		if (ignoreTypeStore[fileType]){
			fs.copyFileSync(item, outputTargetFolder + pathDivider + (relativePath ? relativePath : '') + replacedFilename);
		}
		else {
			let fileContents = replaceAllKeys(fs.readFileSync(item, 'utf8'), replacementPairs, true);
			fs.writeFileSync(outputTargetFolder + pathDivider + (relativePath ? relativePath : '') + replacedFilename, fileContents);
		}
	}
}

function startsWithMatchFound(value){
	for (let index in ignoreStartsWithArray){
		if (value.startsWith(ignoreStartsWithArray[index])){
			return true;
		}
	}
	return false;
}

function endsWithMatchFound(value){
	for (let index in ignoreEndsWithArray){
		if (value.endsWith(ignoreEndsWithArray[index])){
			return true;
		}
	}
	return false;
}

function replaceAllKeys(content, replacementPairs, creatingTemplate){
	let replacementKeys = Object.keys(replacementPairs);
	if (replacementKeys.length == 0){
		return content;
	}

	for (let index in replacementKeys){
		let replacementKey = replacementKeys[index];
		let replacementValue = replacementPairs[replacementKey];

		content = content.replaceAll(replacementKey, replacementValue);
	}
	return content;
}

function checkTargetFolderValidity(item){
	if (item.includes("/SpinUp")){
		Logger.log("Cannot template SpinUp");
		Logger.log("Exiting");
		process.exit(0);
	}

	let pathLength = item.split(pathDivider).length;
	if (pathLength < 4){
		Logger.log("Path is too shallow, file is potentially too large");
		Logger.log("Exiting");
		process.exit(0);
	}

	let folderSize = recursivelyGetFolderSize(item, '', maxFolderSize);
	if (folderSize > maxFolderSize){
		Logger.log("Folder size (" + folderSize + ") exceeds limit");
		Logger.log("Exiting");
		process.exit(0);
	}
}

function recursivelyGetFolderSize(item, path, sizeLimit){
	item = path ? path + pathDivider + item : item;

	let stats = fs.statSync(item);
	let size = 0;

	if (stats.isDirectory()){
		let files = fs.readdirSync(item);
		for (let fileIndex = 0; fileIndex < files.length; fileIndex++){
			let file = files[fileIndex];
			if (ignoreStore[file]){
				continue;
			}
			size += recursivelyGetFolderSize(file, item, size, sizeLimit);
		}
	}
	else {
		size += stats.size;
	}
	return size;
}

function getReplacementPair(replacementPairs){
	let targetText = prompt('Target text: ');
	if (!targetText){
		continueAddingReplacementPairs(replacementPairs);
		return;
	}
	let tagnameText = prompt('Tag name: ');
	if (!tagnameText){
		continueAddingReplacementPairs(replacementPairs);
		return;
	}
	replacementPairs[targetText] = '[' + tagnameText + ']';

	continueAddingReplacementPairs(replacementPairs);
}

function continueAddingReplacementPairs(replacementPairs){
	let addFurtherReplacementPair = prompt('Add further replacement pair? (y/n): ');
	if (!addFurtherReplacementPair){
		return;
	}
	addFurtherReplacementPair = addFurtherReplacementPair.trim().toLowerCase();
	if (addFurtherReplacementPair == 'y'){
		getReplacementPair(replacementPairs);
	}
}

if (process.argv.indexOf("-templateType") != -1){
	templateType = process.argv[process.argv.indexOf("-templateType") + 1];
	if (!templateType){
		setTemplateType();
	}
}
else {
	setTemplateType();
}
let appName;
if (process.argv.indexOf("-appName") != -1){
	appName = process.argv[process.argv.indexOf("-appName") + 1];
	if (!appName){
		setAppName();
	}
}
else {
	setAppName();
}

function setAppName(){
	appName = prompt('Project Name: ');
    if (!appName){
    	Logger.log("Invalid value");
		Logger.log("Exiting");
		process.exit(0);
    }
}

function setTemplateType(){
	let templateList = getDirectories('templates/');
	if (templateList.length == 0){
		Logger.log("No templates present. Please create one with 'templateme' command (see README.md)");
		Logger.log("Exiting");
		process.exit(0);
	}
	let validOptionCount = 0;
	for (let index = 0; index < templateList.length; index++){
		let metadataFilePath = 'templates' + pathDivider + templateList[index] + pathDivider + 'SpinUp_metadata.json';
		if (fs.existsSync(metadataFilePath)){
			if (validOptionCount == 0){
				Logger.log("Template types\n");
			}
			validOptionCount++;
			let metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
			Logger.log('\t' + validOptionCount + ') ' + metadata.displayName);
		}
	}
	Logger.log();
	if (!validOptionCount){
		Logger.log("No valid templates present. Please create one with 'templateme' command (see README.md)");
		Logger.log("Exiting");
		process.exit(0);
	}

	try {
		let templateTypeIndex = prompt((validOptionCount == 1 ? 'Select option: ' : 'Select option (1-' + validOptionCount + '): '));
		if (!templateTypeIndex){
			process.exit(0);
		}
		templateTypeIndex = parseInt(templateTypeIndex) - 1;
		if (templateTypeIndex < 0 || templateTypeIndex >= templateList.length){
			Logger.log("Invalid template index");
			Logger.log("Exiting");
			process.exit(0);
		}
		templateType = templateList[templateTypeIndex];
	}
	catch (error){
		Logger.log("Invalid template index");
		Logger.log("Exiting");
		process.exit(0);
	}
}

function getDirectories(path){
	if (!fs.existsSync(path)){
		Logger.log("No templates present. Please create one with 'templateme' command (see README.md)");
		Logger.log("Exiting");
		process.exit(0);
	}
	return fs.readdirSync(path).filter(
		function(file){
			return fs.statSync(path + pathDivider + file).isDirectory();
		}
	);
}

function create(appName){
	let outputTargetFolder = folderPath + pathDivider + appName;
	if (fs.existsSync(outputTargetFolder)){
		let overwrite = prompt("Overwrite existing project? (y/n): ");
		if (!overwrite){
			Logger.log("Exiting");
			process.exit(0);
		}
		overwrite = overwrite.trim().toLowerCase();
		if (overwrite != 'y'){
			Logger.log("Exiting");
			process.exit(0);
		}
		// delete the folder and continue with normal processing
		fs.rmSync(outputTargetFolder, { recursive: true, force: true });
	}
	else {
		let continueCreate = prompt("Create project inside current folder [" + folderPath + "]? (y/n): ");
		if (!continueCreate){
			Logger.log("Exiting");
			process.exit(0);
		}
		continueCreate = continueCreate.trim().toLowerCase();
		if (continueCreate != 'y'){
			Logger.log("Exiting");
			process.exit(0);
		}
	}

	// get replacementPairs from template metadata
	let templateFolder = __dirname + pathDivider + 'templates' + pathDivider + templateType;
	let metadataFilePath = templateFolder + pathDivider + 'SpinUp_metadata.json';
	let metadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
	let replacementPairs = metadata.replacementPairs;
	
	// get new values from user input
	let inputReplacementPairs = {};
	Logger.log("Please provide replacement values for the following keys...");
	let replacementKeys = Object.keys(replacementPairs);
	for (let index in replacementKeys){
		let key = replacementKeys[index];
		let value = replacementPairs[key];
		let newValue = prompt(value + ": ");
		if (!newValue){
			Logger.log("Cannot replace with empty value");
			Logger.log("Exiting");
			process.exit(0);
		}
		inputReplacementPairs[value] = newValue;
	}

	// it is important to set the global value of targetFolder, so we output to the correct location
	targetFolder = templateFolder;

	recursivelyCopyAndReplace(templateFolder, '', outputTargetFolder, inputReplacementPairs);

	Logger.log("\nCreated '" + appName + "' from '" + templateType + "' and exported to: " + outputTargetFolder + "\n");
}

create(appName);