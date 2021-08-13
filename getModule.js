const {getModule} = require("./fscache");
getModule(process.argv[2]).catch(e => {
	console.error(e);
	process.exitCode = 2;
});
