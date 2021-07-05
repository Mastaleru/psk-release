nodeBootRequire=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"/home/runner/work/privatesky/privatesky/builds/tmp/nodeBoot.js":[function(require,module,exports){
const or = require('overwrite-require');
or.enableForEnvironment(or.constants.NODEJS_ENVIRONMENT_TYPE);

require("./nodeBoot_intermediar");
},{"./nodeBoot_intermediar":"/home/runner/work/privatesky/privatesky/builds/tmp/nodeBoot_intermediar.js","overwrite-require":"overwrite-require"}],"/home/runner/work/privatesky/privatesky/builds/tmp/nodeBoot_intermediar.js":[function(require,module,exports){
global.nodeBootLoadModules = function(){ 

	if(typeof $$.__runtimeModules["NodeThreadWorkerBootScript"] === "undefined"){
		$$.__runtimeModules["NodeThreadWorkerBootScript"] = require("swarm-engine/bootScripts/NodeThreadWorkerBootScript");
	}

	if(typeof $$.__runtimeModules["opendsu"] === "undefined"){
		$$.__runtimeModules["opendsu"] = require("opendsu");
	}

	if(typeof $$.__runtimeModules["overwrite-require"] === "undefined"){
		$$.__runtimeModules["overwrite-require"] = require("overwrite-require");
	}

	if(typeof $$.__runtimeModules["key-ssi-resolver"] === "undefined"){
		$$.__runtimeModules["key-ssi-resolver"] = require("key-ssi-resolver");
	}

	if(typeof $$.__runtimeModules["psk-cache"] === "undefined"){
		$$.__runtimeModules["psk-cache"] = require("psk-cache");
	}

	if(typeof $$.__runtimeModules["pskcrypto"] === "undefined"){
		$$.__runtimeModules["pskcrypto"] = require("pskcrypto");
	}

	if(typeof $$.__runtimeModules["bar"] === "undefined"){
		$$.__runtimeModules["bar"] = require("bar");
	}

	if(typeof $$.__runtimeModules["swarmutils"] === "undefined"){
		$$.__runtimeModules["swarmutils"] = require("swarmutils");
	}

	if(typeof $$.__runtimeModules["bar-fs-adapter"] === "undefined"){
		$$.__runtimeModules["bar-fs-adapter"] = require("bar-fs-adapter");
	}
};
if (true) {
	nodeBootLoadModules();
}
global.nodeBootRequire = require;
if (typeof $$ !== "undefined") {
	$$.requireBundle("nodeBoot");
}

},{"bar":"bar","bar-fs-adapter":"bar-fs-adapter","key-ssi-resolver":"key-ssi-resolver","opendsu":"opendsu","overwrite-require":"overwrite-require","psk-cache":"psk-cache","pskcrypto":"pskcrypto","swarm-engine/bootScripts/NodeThreadWorkerBootScript":"swarm-engine/bootScripts/NodeThreadWorkerBootScript","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar-fs-adapter/lib/FsAdapter.js":[function(require,module,exports){
function FsAdapter() {
    const fsModule = "fs";
    const fs = require(fsModule);
    const pathModule = "path";
    const path = require(pathModule);
    const PathAsyncIterator = require('./PathAsyncIterator');

    this.getFileSize = function (filePath, callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get file size", err));
            }

            callback(undefined, stats.size);
        });
    };

    this.readBlockFromFile = function (filePath, blockStart, blockEnd, callback) {
        const readStream = fs.createReadStream(filePath, {
            start: blockStart,
            end: blockEnd
        });

        let data = $$.Buffer.alloc(0);

        readStream.on("data", (chunk) => {
            data = $$.Buffer.concat([data, chunk]);
        });

        readStream.on("error", (err) => {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to read data from file " + filePath, err));
        });

        readStream.on("end", () => {
            callback(undefined, data);
        });
    };

    this.getFilesIterator = function (inputPath) {
        return new PathAsyncIterator(inputPath);
    };

    this.appendBlockToFile = function (filePath, data, callback) {
        fs.access(filePath, (err) => {
            if (err) {
                fs.mkdir(path.dirname(filePath), {recursive: true}, (err) => {
                    if (err && err.code !== "EEXIST") {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to append block to file "+ filePath, err));
                    }

                    fs.appendFile(filePath, data, callback);
                });
            } else {
                fs.appendFile(filePath, data, callback);
            }
        });
    };
}

module.exports = FsAdapter;
},{"./PathAsyncIterator":"/home/runner/work/privatesky/privatesky/modules/bar-fs-adapter/lib/PathAsyncIterator.js"}],"/home/runner/work/privatesky/privatesky/modules/bar-fs-adapter/lib/PathAsyncIterator.js":[function(require,module,exports){
function PathAsyncIterator(inputPath) {
    const fsModule = "fs";
    const fs = require(fsModule);
    const pathModule = "path";
    const path = require(pathModule);
    const TaskCounter = require("swarmutils").TaskCounter;

    inputPath = path.normalize(inputPath);
    let removablePathLen;
    const fileList = [];
    const folderList = [];
    let isFirstCall = true;
    let pathIsFolder;

    this.next = function (callback) {
        if (isFirstCall === true) {
            isDir(inputPath, (err, status) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to check if <${inputPath}> is directory`, err));
                }

                isFirstCall = false;
                pathIsFolder = status;
                if (status === true) {
                    if(!inputPath.endsWith(path.sep)) {
                        inputPath += path.sep;
                    }

                    removablePathLen = inputPath.length;
                    folderList.push(inputPath);
                    getNextFileFromFolder(callback);
                } else {
                    const fileName = path.basename(inputPath);
                    const fileParentFolder = path.dirname(inputPath);
                    callback(undefined, fileName, fileParentFolder);
                }
            });
        } else if (pathIsFolder) {
            getNextFileFromFolder(callback);
        } else {
            callback();
        }
    };

    function walkFolder(folderPath, callback) {
        const taskCounter = new TaskCounter((errors, results) => {
            if (fileList.length > 0) {
                const fileName = fileList.shift();
                return callback(undefined, fileName, inputPath);
            }

            if (folderList.length > 0) {
                const folderName = folderList.shift();
                return walkFolder(folderName, callback);
            }

            return callback();
        });

        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read dir  <${folderPath}>`, err));
            }

            if (files.length === 0 && folderList.length === 0) {
                return callback();
            }

            if (files.length === 0) {
                walkFolder(folderList.shift(), callback);
            }
            taskCounter.increment(files.length);

            files.forEach(file => {
                let filePath = path.join(folderPath, file);
                isDir(filePath, (err, status) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to check if <${filePath}> is directory`, err));
                    }

                    if (status) {
                        folderList.push(filePath);
                    } else {
                        fileList.push(filePath.substring(removablePathLen));
                    }

                    taskCounter.decrement();
                });
            });
        });
    }

    function isDir(filePath, callback) {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get stats for file <${filePath}>`, err));
            }

            return callback(undefined, stats.isDirectory());
        });
    }

    function getNextFileFromFolder(callback) {
        if (fileList.length === 0 && folderList.length === 0) {
            return callback();
        }

        if (fileList.length > 0) {
            const fileName = fileList.shift();
            return callback(undefined, fileName, inputPath);
        }

        const folder = folderList.shift();
        walkFolder(folder, (err, file) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to walk folder  <${folder}>`, err));
            }

            callback(undefined, file, inputPath);
        });
    }
}

module.exports = PathAsyncIterator;
},{"swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/AnchorValidator.js":[function(require,module,exports){
'use strict'

/**
 * 
 * @param {object} options 
 * @param {object} options.rules
 * @param {object} options.rules.preWrite
 * @param {object} options.rules.afterLoad
 */
function AnchorValidator(options) {
    options = options || {};

    let validationRules = options.rules || {};

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {string} stage The validation stage (afterLoad, preWrite, ...)
     * @param {...} args
     */
    this.validate = (stage, ...args) => {
        const callback = args[args.length - 1];
        if (typeof validationRules[stage] !== 'object') {
            return callback();
        }

        const stageValidation = validationRules[stage];
        if (typeof stageValidation.validate !== 'function') {
            return callback(new Error('Validation rules invalid. Missing the `validate` method'));
        }
        stageValidation.validate(...args);
    }

    /**
     * @param {object} rules
     * @param {object} rules.preWrite
     * @param {object} rules.afterLoad
     */
    this.setRules = (rules) => {
        validationRules = rules;
    }
}

module.exports = AnchorValidator;
},{}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/Archive.js":[function(require,module,exports){
const Brick = require('./Brick');
const stream = require('stream');
const BrickStorageService = require('./BrickStorageService').Service;
const BrickMapController = require('./BrickMapController');
const Manifest = require("./Manifest");

/**
 * @param {ArchiveConfigurator} archiveConfigurator
 */
function Archive(archiveConfigurator) {
    const swarmutils = require("swarmutils");
    const TaskCounter = swarmutils.TaskCounter;
    const pskPth = swarmutils.path;
    const openDSU = require("opendsu");
    const anchoring = openDSU.loadAPI("anchoring");
    const notifications = openDSU.loadAPI("notifications");

    const mountedArchivesForBatchOperations = [];

    let brickMapController;
    let brickStorageService;
    let manifestHandler;
    let batchOperationsInProgress = false;
    let prevAnchoringDecisionFn;
    let prevConflictResolutionFunction;

    let publishAnchoringNotifications = false;
    let publishOptions = null;

    let autoSyncStatus = false;
    let autoSyncOptions = null;
    let dsuObsHandler = null;

    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////
    const initialize = (callback) => {
        archiveConfigurator.getKeySSI((err, keySSI) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to retrieve keySSI", err));
            }

            brickStorageService = buildBrickStorageServiceInstance(keySSI);
            brickMapController = new BrickMapController({
                config: archiveConfigurator,
                brickStorageService,
                keySSI
            });

            callback();
        });
    }

    /**
     * Create and configure the BrickStorageService
     *
     * @param {object} storageProvider
     * @return {BrickStorageService}
     */
    function buildBrickStorageServiceInstance(keySSI) {
        const instance = new BrickStorageService({
            cache: archiveConfigurator.getCache(),
            bufferSize: archiveConfigurator.getBufferSize(),
            keySSI,

            brickFactoryFunction: (encrypt) => {
                encrypt = (typeof encrypt === 'undefined') ? true : !!encrypt;
                // Strip the encryption key from the SeedSSI
                return new Brick({templateKeySSI: keySSI, encrypt});
            },

            brickDataExtractorCallback: (brickMeta, brick, callback) => {
                brick.setTemplateKeySSI(keySSI);
                const brickEncryptionKeySSI = brickMapController.getBrickEncryptionKeySSI(brickMeta);
                brick.setKeySSI(brickEncryptionKeySSI);
                brick.getRawData(callback);
            },

            fsAdapter: archiveConfigurator.getFsAdapter()
        });

        return instance;
    }

    const cancelBatchesInMountedArchives = (callback) => {
        const cancelBatch = (dossierContext) => {
            if (!dossierContext) {
                return callback();
            }

            dossierContext.archive.cancelBatch((err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to cancel batch operation", err));
                }

                cancelBatch(mountedArchivesForBatchOperations.pop());
            })
        }

        cancelBatch(mountedArchivesForBatchOperations.pop());
    }

    const commitBatchesInMountedArchives = (onConflict, callback) => {
        const results = [];

        const commitBatch = (dossierContext) => {
            if (!dossierContext) {
                return callback(undefined, results);
            }

            dossierContext.archive.commitBatch(onConflict, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to commit batch", err));
                }

                results.push(result);
                commitBatch(mountedArchivesForBatchOperations.pop());
            });
        }

        commitBatch(mountedArchivesForBatchOperations.pop());
    }

    const getArchiveForBatchOperations = (manifestHandler, path, callback) => {
        manifestHandler.getArchiveForPath(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }

            if (result.archive === this) {
                return callback(undefined, result);
            }

            result.archive.getKeySSIAsString((err, keySSI) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to retrieve keySSI", err));
                }

                const cachedArchive = mountedArchivesForBatchOperations.find((archive) => {
                    return archive.identifier === keySSI;
                });

                if (cachedArchive) {
                    cachedArchive.relativePath = result.relativePath;
                    return callback(undefined, cachedArchive);
                }

                result.identifier = keySSI;
                result.archive.beginBatch();
                mountedArchivesForBatchOperations.push(result);

                if (!publishAnchoringNotifications || publishOptions.ignoreMounts) {
                    return callback(undefined, result);
                }

                result.archive.enableAnchoringNotifications(publishAnchoringNotifications, publishOptions, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to toggle anchoring notification publishing for mount point: ${mountPoint}`, err));
                    }

                    callback(undefined, result);
                })
            });
        });
    };

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////
    /**
     * @param {callback} callback
     */
    this.init = (callback) => {
        initialize((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to initialize DSU", err));
            }

            brickMapController.init(callback);
        });
    }

    /**
     * @param {callback} callback
     */
    this.load = (callback) => {
        initialize((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load DSU", err));
            }

            brickMapController.load(callback);
        });
    };

    /**
     * @param {callback} callback
     */
    this.refresh = (callback) => {
        this.load((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load DSU", err));
            }

            // Restore auto sync settings if the archive was refreshed
            this.enableAnchoringNotifications(publishAnchoringNotifications, publishOptions, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to toggle anchoring notification publishing for mount point: ${mountPoint}`, err));
                }
                this.enableAutoSync(autoSyncStatus, autoSyncOptions, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to enable auto sync for DSU", err));
                    }
                    callback();
                });
            });
        });
    }

    /**
     * @param {callback} function
     *
     * @return {HashLinkSSI}
     */
    this.getLastHashLinkSSI = (callback) => {
        archiveConfigurator.getKeySSI((err, keySSI) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get KeySSI", err));
            }
            anchoring.getAllVersions(keySSI, (err, hashlinksArray) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get the list of hashlinks", err));
                }

                return callback(undefined, hashlinksArray[hashlinksArray.length - 1])
            })
        })

    };

    /**
     * @return {string}
     */
    this.getKeySSI = (keySSIType, callback) => {
        console.trace("Obsolete function: use getKeySSIAsString or getKeySSIAsObject Instead");
        if (typeof keySSIType === "function") {
            callback = keySSIType;
            keySSIType = undefined;
        }
        archiveConfigurator.getKeySSI(keySSIType, ((err, keySSI) => callback(err, keySSI.getIdentifier())));
    }

    /**
     * @return {string}
     */
    this.getKeySSIAsObject = (keySSIType, callback) => {
        if (typeof keySSIType === "function") {
            callback = keySSIType;
            keySSIType = undefined;
        }
        archiveConfigurator.getKeySSI(keySSIType, callback);
    }

    /**
     * @return {string}
     */
    this.getKeySSIAsString = (keySSIType, callback) => {
        if (typeof keySSIType === "function") {
            callback = keySSIType;
            keySSIType = undefined;
        }
        archiveConfigurator.getKeySSI(keySSIType, ((err, keySSI) => callback(err, keySSI.getIdentifier())));
    }

    /**
     * @return {string}
     */
    this.getCreationSSI = (plain) => {
        return archiveConfigurator.getCreationSSI(plain);
    }

    /**
     * @param {string} barPath
     * @param {string|$$.Buffer|stream.ReadableStream} data
     * @param {object} options
     * @param {callback} callback
     */
    const _writeFile = (barPath, data, options, callback) => {
        if (typeof data === "function") {
            callback = data;
            data = undefined;
            options = undefined;
        }
        if (typeof options === "function") {
            callback = options;
            options = {
                encrypt: true
            };
        }
        if (typeof options === "undefined") {
            options = {
                encrypt: true
            };
        }

        barPath = pskPth.normalize(barPath);

        if (typeof data === "undefined") {
            return _createFile(barPath, callback);
        }

        brickStorageService.ingestData(data, options, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to ingest data into brick storage service", err));
            }

            brickMapController.addFile(barPath, result, callback);
        });
    };

    /**
     * @param {string} barPath
     * @param {callback} callback
     */
    const _readFile = (barPath, callback) => {
        barPath = pskPth.normalize(barPath);

        let bricksMeta;

        try {
            bricksMeta = brickMapController.getBricksMeta(barPath);
        } catch (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to find any info for path " + barPath + " in brickmap", err));
        }

        brickStorageService.createBufferFromBricks(bricksMeta, (err, buffer) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create buffer from bricks", err));
            }

            callback(undefined, buffer);
        });
    };

    /**
     * @param {string} barPath
     * @param {callback} callback
     */
    const _createReadStream = (barPath, callback) => {
        barPath = pskPth.normalize(barPath);

        let bricksMeta;
        try {
            bricksMeta = brickMapController.getBricksMeta(barPath);
        } catch (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to find any info for path " + barPath, err));
        }

        brickStorageService.createStreamFromBricks(bricksMeta, (err, stream) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create stream from bricks", err));
            }

            callback(undefined, stream);
        });
    };

    /**
     * @param {string} fsFilePath
     * @param {string} barPath
     * @param {object} options
     * @param {callback} callback
     */
    const _addFile = (fsFilePath, barPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {
                encrypt: true
            }
        }

        barPath = pskPth.normalize(barPath);

        brickStorageService.ingestFile(fsFilePath, options, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to ingest data into bricks storage", err));
            }

            brickMapController.addFile(barPath, result, callback);
        })
    };

    /**
     * @param {string} files
     * @param {string} barPath
     * @param {object} options
     * @param {callback} callback
     */
    const _addFiles = (files, barPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {
                encrypt: true,
                embedded: false
            };
        }

        barPath = pskPth.normalize(barPath);

        const filesArray = files.slice();

        const ingestionMethod = (!options.embedded) ? 'ingestFiles' : 'createBrickFromFiles';

        brickStorageService[ingestionMethod](filesArray, options, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to add files at path " + barPath, err));
            }

            brickMapController.addFiles(barPath, result, callback);
        });
    };

    this.addFiles = (files, barPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {
                encrypt: true,
                ignoreMounts: false,
                embedded: false
            };
        }

        if (options.ignoreMounts === true) {
            _addFiles(files, barPath, options, callback);
        } else {
            this.getArchiveForPath(barPath, (err, dossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }

                options.ignoreMounts = true;
                dossierContext.archive.addFiles(files, dossierContext.relativePath, options, callback);
            });
        }
    }

    /**
     * @param {string} fsFilePath
     * @param {string} barPath
     * @param {callback} callback
     */
    const _extractFile = (fsFilePath, barPath, callback) => {
        if (typeof barPath === "function") {
            callback = barPath;
            barPath = pskPth.normalize(fsFilePath);
        }

        let bricksMeta;

        try {
            bricksMeta = brickMapController.getBricksMeta(barPath);
        } catch (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to any information for path " + barPath, err));
        }


        brickStorageService.createFileFromBricks(fsFilePath, bricksMeta, callback);
    };

    /**
     * @param {string} barPath
     * @param {string|$$.Buffer|stream.ReadableStream} data
     * @param {callback} callback
     */
    this.appendToFile = (barPath, data, options, callback) => {
        const defaultOpts = {encrypt: true, ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts) {
            barPath = pskPth.normalize(barPath);
            brickStorageService.ingestData(data, options, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to append data to file " + barPath, err));
                }

                brickMapController.appendToFile(barPath, result, callback);
            });
        } else {
            this.getArchiveForPath(barPath, (err, dossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }
                if (dossierContext.readonly === true) {
                    return callback(Error("Tried to write in a readonly mounted RawDossier"));
                }

                options.ignoreMounts = true;
                dossierContext.archive.appendToFile(dossierContext.relativePath, data, options, callback);
            });
        }
    };


    this.dsuLog = (message, callback) => {
        this.appendToFile("/dsu-metadata-log", message + "\n", {ignoreMissing: true}, callback);
    }
    /**
     * @param {string} fsFolderPath
     * @param {string} barPath
     * @param {object} options
     * @param {callback} callback
     */
    const _addFolder = (fsFolderPath, barPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {
                encrypt: true,
                embedded: false
            };
        }
        barPath = pskPth.normalize(barPath);

        const ingestionMethod = (!options.embedded) ? 'ingestFolder' : 'createBrickFromFolder';

        brickStorageService[ingestionMethod](fsFolderPath, options, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to add folder ${fsFolderPath} to  ${barPath}`, err));
            }

            brickMapController.addFiles(barPath, result, callback);
        });
    };

    /**
     * @param {string} fsFolderPath
     * @param {string} barPath
     * @param {callback} callback
     */
    const _extractFolder = (fsFolderPath, barPath, callback) => {
        if (typeof barPath === "function") {
            callback = barPath;
            barPath = pskPth.normalize(fsFolderPath);
        }

        const filePaths = brickMapController.getFileList(barPath);
        const taskCounter = new TaskCounter(() => {
            callback();
        });
        taskCounter.increment(filePaths.length);
        filePaths.forEach(filePath => {
            let actualPath;
            if (fsFolderPath) {
                if (fsFolderPath.includes(filePath)) {
                    actualPath = fsFolderPath;
                } else {
                    actualPath = require("path").join(fsFolderPath, filePath);
                }
            } else {
                actualPath = filePath;
            }

            this.extractFile(actualPath, filePath, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to extract file ${actualPath} to ${filePath}`, err));
                }

                taskCounter.decrement();
            });
        });
    };

    /**
     * @param {string} barPath
     * @param {callback} callback
     */
    const _delete = (barPath, callback) => {
        brickMapController.deleteFile(barPath, callback);
        //this resets the state in case a folder gets removed and under the same path are other dsu mounted.
        manifestHandler = undefined;
    };

    /**
     * @param {string} srcPath
     * @param {dstPath} dstPath
     */

    const _rename = (srcPath, dstPath, callback) => {
        srcPath = pskPth.normalize(srcPath);
        dstPath = pskPth.normalize(dstPath);

        brickMapController.renameFile(srcPath, dstPath, callback);
    }

    /**
     * @param {string} folderBarPath
     * @param {object} options
     * @param {callback} callback
     */
    const _listFiles = (folderBarPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {recursive: true};
        } else if (typeof folderBarPath === "function") {
            callback = folderBarPath;
            options = {recursive: true};
            folderBarPath = "/";
        }

        let fileList;
        let error;
        try {
            fileList = brickMapController.getFileList(folderBarPath, options.recursive);
        } catch (e) {
            error = e;
        }

        setTimeout(() => {
            callback(error, fileList);
        }, 0)
    };

    const _listMountedFiles = (mountPoints, result, callback) => {
        if (typeof result === 'function') {
            callback = result;
            result = [];
        }
        let mountPoint = mountPoints.shift();

        if (!mountPoint) {
            return callback(undefined, result)
        }

        mountPoint = pskPth.normalize(mountPoint);

        this.listFiles(mountPoint, {
            recursive: true,
            ignoreMounts: false
        }, (err, files) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list files at path ${mountPoint}`, err));
            }

            result.push(files.map((file) => {
                let prefix = mountPoint;
                if (prefix[0] === '/') {
                    prefix = prefix.substring(1);
                }

                return pskPth.normalize(`${prefix}/${file}`);
            }));

            _listMountedFiles(mountPoints, result, callback);
        });
    };

    /**
     * @param {string} folderBarPath
     * @param {object} options
     * @param {boolean} options.recursive
     * @param {callback} callback
     */
    const _listFolders = (folderBarPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {recursive: true};
        }

        callback(undefined, brickMapController.getFolderList(folderBarPath, options.recursive));
    };

    const _listMountedFolders = (mountPoints, result, callback) => {
        if (typeof result === 'function') {
            callback = result;
            result = [];
        }

        let mountPoint = mountPoints.shift();
        if (!mountPoint) {
            return callback(undefined, result);
        }

        mountPoint = pskPth.normalize(mountPoint);

        this.listFolders(mountPoint, {
            recursive: true,
            ignoreMounts: false
        }, (err, folders) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list mounted folders at path ${mountPoint}`, err));
            }

            result.push((folders.map((folder) => {
                let prefix = mountPoint;
                if (prefix[0] === '/') {
                    prefix = prefix.substring(1);
                }

                return pskPth.normalize(`${prefix}/${folder}`);
            })));

            _listMountedFolders(mountPoints, result, callback);
        })
    };

    /**
     * @param {string} barPath
     * @param {callback} callback
     */
    const _createFolder = (barPath, callback) => {
        brickMapController.createDirectory(barPath, callback);
    };

    const _createFile = (barPath, callback) => {
        brickMapController.createEmptyFile(barPath, callback);
    };

    /**
     * @param {object} rules
     * @param {object} rules.preWrite
     * @param {object} rules.afterLoad
     */
    this.setValidationRules = (rules) => {
        brickMapController.setValidationRules(rules);
    }

    /**
     * @param {callback} listener
     */
    this.setAnchoringEventListener = (listener) => {
        this.getAnchoringStrategy().setAnchoringEventListener(listener);
    }

    /**
     * @param {callback} callback
     */
    this.setDecisionCallback = (callback) => {
        this.getAnchoringStrategy().setDecisionCallback(callback);
    }

    /**
     * @return {AnchoringStrategy}
     */
    this.getAnchoringStrategy = () => {
        return archiveConfigurator.getBrickMapStrategy();
    }

    /**
     * Manually anchor any changes
     */
    this.doAnchoring = (callback) => {
        const strategy = this.getAnchoringStrategy();
        const anchoringEventListener = strategy.getAnchoringEventListener() || callback;
        if (typeof anchoringEventListener !== 'function') {
            throw new Error('An anchoring event listener is required');
        }

        brickMapController.anchorChanges(anchoringEventListener);
    }

    const getManifest = (callback) => {
        if (typeof manifestHandler === "undefined") {
            Manifest.getManifest(this, (err, handler) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
                }

                manifestHandler = handler;
                return callback(undefined, manifestHandler);
            });
        } else {
            return callback(undefined, manifestHandler);
        }
    }

    this.getSSIForMount = (mountPoint, callback) => {
        getManifest((err, manifestHandler) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load manifest for " + mountPoint, err));
            }
            manifestHandler.getArchiveIdentifier(mountPoint, callback);
        });
    }

    this.addFolder = (fsFolderPath, barPath, options, callback) => {
        const defaultOpts = {encrypt: true, ignoreMounts: false, embedded: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;


        if (options.ignoreMounts === true) {
            _addFolder(fsFolderPath, barPath, options, callback);
        } else {
            this.getArchiveForPath(barPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }

                options.ignoreMounts = true;
                result.archive.addFolder(fsFolderPath, result.relativePath, options, callback);
            });
        }
    };

    this.addFile = (fsFilePath, barPath, options, callback) => {
        const defaultOpts = {encrypt: true, ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts === true) {
            _addFile(fsFilePath, barPath, options, callback);
        } else {
            this.getArchiveForPath(barPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }

                options.ignoreMounts = true;
                result.archive.addFile(fsFilePath, result.relativePath, options, callback);
            });
        }
    };

    this.readFile = (fileBarPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        if (options.ignoreMounts === true) {
            _readFile(fileBarPath, callback);
        } else {
            this.getArchiveForPath(fileBarPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${fileBarPath}`, err));
                }

                options.ignoreMounts = true
                result.archive.readFile(result.relativePath, options, callback);
            });
        }
    };

    this.createReadStream = (fileBarPath, options, callback) => {
        const defaultOpts = {encrypt: true, ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        if (options.ignoreMounts === true) {
            _createReadStream(fileBarPath, callback);
        } else {
            this.getArchiveForPath(fileBarPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${fileBarPath}`, err));
                }

                options.ignoreMounts = true;
                result.archive.createReadStream(result.relativePath, options, callback);
            });
        }
    };

    this.extractFolder = (fsFolderPath, barPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        if (options.ignoreMounts === true) {
            _extractFolder(fsFolderPath, barPath, callback);
        } else {
            this.getArchiveForPath(barPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }

                options.ignoreMounts = true;
                result.archive.extractFolder(fsFolderPath, result.relativePath, options, callback);
            });
        }
    };

    this.extractFile = (fsFilePath, barPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts === true) {
            _extractFile(fsFilePath, barPath, callback);
        } else {
            this.getArchiveForPath(barPath, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }

                options.ignoreMounts = true;
                result.archive.extractFile(fsFilePath, result.relativePath, options, callback);
            });
        }
    };

    this.writeFile = (path, data, options, callback) => {
        const defaultOpts = {encrypt: true, ignoreMounts: false};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);

        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts === true) {
            _writeFile(path, data, options, callback);
        } else {
            this.getArchiveForPath(path, (err, dossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
                }
                if (dossierContext.readonly === true) {
                    return callback(Error("Tried to write in a readonly mounted RawDossier"));
                }

                options.ignoreMounts = true;
                dossierContext.archive.writeFile(dossierContext.relativePath, data, options, callback);
            });
        }
    };


    this.delete = (path, options, callback) => {
        const defaultOpts = {ignoreMounts: false, ignoreError: false};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = $$.makeSaneCallback(callback);

        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts) {
            return _delete(path, err => {
                if (!err || (err && options.ignoreError)) {
                    return callback();
                }

                callback(err);
            });
        }

        this.getArchiveForPath(path, (err, dossierContext) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }

            if (dossierContext.readonly === true) {
                return callback(Error("Tried to delete in a readonly mounted RawDossier"));
            }

            options.ignoreMounts = true;
            dossierContext.archive.delete(dossierContext.relativePath, options, callback);
        });
    };

    this.rename = (srcPath, dstPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts) {
            _rename(srcPath, dstPath, callback);
            return;
        }

        this.getArchiveForPath(srcPath, (err, dossierContext) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${srcPath}`, err));
            }
            if (dossierContext.readonly === true) {
                return callback(Error("Tried to rename in a readonly mounted RawDossier"));
            }

            const relativeSrcPath = dossierContext.relativePath;
            this.getArchiveForPath(dstPath, (err, dstDossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${dstPath}`, err));
                }

                if (dstDossierContext.prefixPath !== dossierContext.prefixPath) {
                    return callback(Error('Destination is invalid. Renaming must be done in the scope of the same dossier'));
                }

                options.ignoreMounts = true;
                dossierContext.archive.rename(relativeSrcPath, dstDossierContext.relativePath, options, callback);
            })
        });
    };

    this.listFiles = (path, options, callback) => {
        const defaultOpts = {ignoreMounts: false, recursive: true};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        if (options.ignoreMounts === true) {
            if (!options.recursive) {
                return _listFiles(path, options, callback);
            }

            return _listFiles(path, options, (err, files) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list files at path ${path}`, err));
                }

                getManifest((err, manifest) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest`, err));
                    }

                    const mountPoints = manifest.getMountPoints();
                    if (!mountPoints.length) {
                        return callback(undefined, files);
                    }

                    _listMountedFiles(mountPoints, (err, mountedFiles) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list mounted files at mountPoints ${mountPoints}`, err));
                        }

                        files = files.concat(...mountedFiles);
                        return callback(undefined, files);
                    });
                })
            })
        }

        this.getArchiveForPath(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }

            options.ignoreMounts = true;
            result.archive.listFiles(result.relativePath, options, callback);
        });
    };

    this.listFolders = (path, options, callback) => {
        const defaultOpts = {ignoreMounts: false, recursive: false};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts === true) {
            if (!options.recursive) {
                return _listFolders(path, options, callback);
            }

            return _listFolders(path, options, (err, folders) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list folders at path ${path}`, err));
                }

                getManifest((err, manifest) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest`, err));
                    }

                    const mountPoints = manifest.getMountPoints();
                    if (!mountPoints.length) {
                        return callback(undefined, folders);
                    }

                    _listMountedFolders(mountPoints, (err, mountedFolders) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list mounted folders at mountPoints ${mountPoints}`, err));
                        }

                        folders = folders.concat(...mountedFolders);
                        return callback(undefined, folders);
                    });
                })
            })
        }

        this.getArchiveForPath(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }

            options.ignoreMounts = true;
            result.archive.listFolders(result.relativePath, options, callback);
        });
    };

    this.createFolder = (barPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false, encrypt: true};
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts === true) {
            _createFolder(barPath, callback);
        } else {
            this.getArchiveForPath(barPath, (err, dossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${barPath}`, err));
                }
                if (dossierContext.readonly === true) {
                    return callback(Error("Tried to write in a readonly mounted RawDossier"));
                }

                options.ignoreMounts = true;
                dossierContext.archive.createFolder(dossierContext.relativePath, options, callback);
            });
        }
    };

    this.readDir = (folderPath, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {
                withFileTypes: false
            };
        }

        callback = $$.makeSaneCallback(callback);
        const entries = {};
        this.getArchiveForPath(folderPath, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${folderPath}`, err));
            }

            result.archive.listFiles(result.relativePath, {recursive: false, ignoreMounts: true}, (err, files) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list files at path ${result.relativePath}`, err));
                }

                entries.files = files;

                result.archive.listFolders(result.relativePath, {
                    recursive: false,
                    ignoreMounts: true
                }, (err, folders) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list folders at path ${result.relativePath}`, err));
                    }

                    if (options.withFileTypes) {
                        entries.folders = folders;
                    } else {
                        entries.files = [...entries.files, ...folders];
                    }
                    if (result.archive === this) {
                        getManifest(listMounts);
                    } else {
                        Manifest.getManifest(result.archive, listMounts);
                    }

                    function listMounts(err, handler) {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list mounts`, err));
                        }

                        handler.getMountedDossiers(result.relativePath, (err, mounts) => {
                            if (err) {
                                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get mounted DSUs at path ${result.relativePath}`, err));
                            }
                            let mountPaths = mounts.map(mount => mount.path);
                            let folders = mountPaths.filter(mountPath => mountPath.split('/').length >= 2);
                            folders = folders.map(mountPath => mountPath.split('/').shift());
                            let mountedDossiers = mountPaths.filter(mountPath => mountPath.split('/').length === 1);
                            mountedDossiers = mountedDossiers.map(mountPath => mountPath.split('/').shift());
                            if (options.withFileTypes) {
                                entries.mounts = mountedDossiers;
                                entries.folders = Array.from(new Set([...entries.folders, ...folders]));
                                entries.mounts = entries.mounts.filter(mount => entries.folders.indexOf(mount) === -1);
                                return callback(undefined, entries);
                            }
                            entries.files = Array.from(new Set([...entries.files, ...mounts, ...folders]));
                            return callback(undefined, entries.files);
                        });
                    }
                });
            });
        });
    };

    this.cloneFolder = (srcPath, destPath, options, callback) => {
        const defaultOpts = {ignoreMounts: false};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        callback = $$.makeSaneCallback(callback);
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        if (options.ignoreMounts) {
            brickMapController.cloneFolder(srcPath, destPath, callback);
            return;
        }

        this.getArchiveForPath(srcPath, (err, dossierContext) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${srcPath}`, err));
            }
            if (dossierContext.readonly === true) {
                return callback(Error("Tried to rename in a readonly mounted RawDossier"));
            }

            this.getArchiveForPath(destPath, (err, dstDossierContext) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${dstPath}`, err));
                }

                if (dstDossierContext.prefixPath !== dossierContext.prefixPath) {
                    return callback(Error('Destination is invalid. Renaming must be done in the scope of the same dossier'));
                }

                options.ignoreMounts = true;
                dossierContext.archive.cloneFolder(dossierContext.relativePath, dstDossierContext.relativePath, options, callback);
            })
        });
    }

    this.mount = (path, archiveSSI, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }

        callback = $$.makeSaneCallback(callback);

        const keySSISpace = require("opendsu").loadAPI("keyssi");

        if (typeof archiveSSI === "string") {
            try {
                archiveSSI = keySSISpace.parse(archiveSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`The provided archiveSSI is not a valid SSI string.`, e));
            }
        }

        if (typeof archiveSSI === "object") {
            try {
                archiveSSI = archiveSSI.getIdentifier();
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`The provided archiveSSI is not a valid SSI instance`));
            }
        } else {
            return callback(createOpenDSUErrorWrapper(`The provided archiveSSI is neither a string nor a valid SSI instance`));
        }

        function internalMount() {
            _listFiles(path, (err, files) => {
                if (!err && files.length > 0) {
                    return callback(Error("Tried to mount in a non-empty folder"));
                }
                getManifest((err, manifestHandler) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
                    }

                    manifestHandler.mount(path, archiveSSI, options, callback);
                });
            });
        }

        this.getArchiveForPath(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }
            if (result.relativePath === path) {
                internalMount()
            } else {
                result.archive.mount(result.relativePath, archiveSSI, options, callback)
            }
        });
    };

    this.unmount = (path, callback) => {
        callback = $$.makeSaneCallback(callback);

        getManifest((err, manifestHandler) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
            }

            manifestHandler.unmount(path, callback);
        });
    };

    this.listMountedDossiers = (path, callback) => {
        callback = $$.makeSaneCallback(callback);

        this.getArchiveForPath(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
            }

            if (result.archive === this) {
                getManifest(listMounts);
            } else {
                Manifest.getManifest(result.archive, listMounts);
            }

            function listMounts(err, handler) {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to list mounts`, err));
                }

                handler.getMountedDossiers(result.relativePath, callback);
            }
        });
    };

    this.listMountedDSUs = this.listMountedDossiers;

    this.hasUnanchoredChanges = () => {
        const changesExist = mountedArchivesForBatchOperations.reduce((acc, dossierContext) => {
            return acc || dossierContext.archive.hasUnanchoredChanges();
        }, false);
        return brickMapController.hasUnanchoredChanges() || changesExist;
    };

    this.getArchiveForPath = (path, callback) => {
        callback = $$.makeSaneCallback(callback);

        getManifest((err, handler) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
            }

            if (this.batchInProgress()) {
                return getArchiveForBatchOperations(handler, path, callback);
            }


            handler.getArchiveForPath(path, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${path}`, err));
                }


                if (result.archive === this || (!publishAnchoringNotifications || publishOptions.ignoreMounts)) {
                    return callback(undefined, result);
                }

                result.archive.enableAnchoringNotifications(publishAnchoringNotifications, publishOptions, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to toggle anchoring notification publishing for mount point: ${mountPoint}`, err));
                    }

                    callback(undefined, result);
                })
            });
        });
    };

    /**
     * Start a batch of operations
     * This will force the anchoring when the
     * batch is commited
     */
    this.beginBatch = () => {
        if (batchOperationsInProgress) {
            throw new Error("Another anchoring transaction is already in progress. Cancel the previous batch and try again.");
        }

        batchOperationsInProgress = true;

        // Save the previous decision function
        const anchoringStrategy = this.getAnchoringStrategy();
        prevAnchoringDecisionFn = anchoringStrategy.getDecisionFunction();

        // Prevent anchoring after each operation
        anchoringStrategy.setDecisionFunction((brickMap, callback) => {
            return callback(undefined, false);
        })
    };

    /**
     * @return {boolean}
     */
    this.batchInProgress = () => {
        return batchOperationsInProgress;
    }

    /**
     * Anchor batch of changes
     * @param {callback} onConflict If defined it will be called if a conflict occurs
     * @param {callback} callback
     */
    this.commitBatch = (onConflict, callback) => {
        if (typeof callback === 'undefined') {
            callback = onConflict;
            onConflict = undefined;
        }
        if (!batchOperationsInProgress) {
            return callback(new Error("No batch operations have been scheduled"))
        }

        let usesOnConflictCallback = false;

        const anchoringStrategy = this.getAnchoringStrategy();
        if (!anchoringStrategy.getConflictResolutionFunction() && typeof onConflict !== 'undefined') {
            prevConflictResolutionFunction = anchoringStrategy.getConflictResolutionFunction();
            // Set 'onConflict' callback
            anchoringStrategy.setConflictResolutionFunction(onConflict);
            usesOnConflictCallback = true;
        }

        commitBatchesInMountedArchives(onConflict, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to anchor`, err));
            }
            this.doAnchoring((err, result) => {
                batchOperationsInProgress = false;
                anchoringStrategy.setDecisionFunction(prevAnchoringDecisionFn);
                if (usesOnConflictCallback) {
                    // Restore the 'conflictResolutionFn'
                    anchoringStrategy.setConflictResolutionFunction(prevConflictResolutionFunction);
                }

                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to anchor`, err));
                }

                this.refresh((err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to reload current DSU`, err));
                    }
                    callback(undefined, result);
                })
            });
        });
    };

    /**
     * Cancel the current anchoring batch
     */
    this.cancelBatch = (callback) => {
        if (!batchOperationsInProgress) {
            return callback(new Error("No batch operations have been scheduled"))
        }

        cancelBatchesInMountedArchives((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to cancel batches in mounted archive`, err));
            }

            batchOperationsInProgress = false;
            this.getAnchoringStrategy().setDecisionFunction(prevAnchoringDecisionFn);
            this.load((err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load current DSU`, err));
                }
                callback();
            })
        });
    };

    /**
     * Execute a batch of operations
     * then anchor the changes
     *
     * @param {function} batch
     * @param {callback} callback
     */
    this.batch = (batch, callback) => {
        this.beginBatch();
        batch((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to execute batch operations`, err));
            }

            this.commitBatch(callback);
        });
    }

    /**
     * @param {function} handler
     */
    this.setMergeConflictsHandler = (handler) => {
        this.getAnchoringStrategy().setConflictResolutionFunction(handler);
    }

    /**
     * Toggle notifications publishing for new anchors
     *
     * @param {boolean} status When `true` the DSU will publish a notification
     *                         after each successful anchoring
     * @param {object} options
     * @param {boolean} options.ignoreMounts Default `true`. If `false` enable publishing for all mount points
     * @param {function} callback
     */
    this.enableAnchoringNotifications = (status, options, callback) => {
        if (status === brickMapController.anchoringNotificationsEnabled()) {
            return callback();
        }
        options = options || {};

        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        const defaultOptions = {
            ignoreMounts: true
        };
        options = {
            ...defaultOptions,
            ...options
        };

        const prevOptions = publishOptions;

        publishAnchoringNotifications = status;
        publishOptions = (status) ? options : null;

        if (publishAnchoringNotifications && options.ignoreMounts) {
            // No need to recurse in mount points
            brickMapController.enableAnchoringNotifications(status);
            return callback();
        }

        // If the notificatios were enabled with ignoring mount
        // points there's no need to recurse in the mounted archives
        if (!status && (!prevOptions || prevOptions.ignoreMounts)) {
            brickMapController.enableAnchoringNotifications(status);
            return callback();
        }

        let mountPoints = [];

        // Recurse in all mount points and set the anchoring notifications settings
        const propagateNotificationSettings = (manifest, callback) => {
            if (!mountPoints.length) {
                return callback();
            }

            const mountPoint = mountPoints.pop();

            manifest.getArchiveForPath(mountPoint, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${mountPoint}`, err));
                }

                result.archive.enableAnchoringNotifications(publishAnchoringNotifications, publishOptions, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to toggle anchoring notification publishing for mount point: ${mountPoint}`, err));
                    }

                    propagateNotificationSettings(manifest, callback);
                })
            });
        }

        getManifest((err, manifest) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
            }

            mountPoints = manifest.getMountPoints();

            propagateNotificationSettings(manifest, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Unable to toggle anchoring notifications publishing for mounted DSUs", err));
                }

                brickMapController.enableAnchoringNotifications(status);
                callback();
            })
        });
    }

    /**
     * Toggle subscribing to anchor notifications
     * and auto merging upstream changes
     *
     * @param {boolean} status
     * @param {object} options
     * @param {function} options.onError((err) => {}) Error listener
     * @param {function} options.onSync(() => {}) Sync listener
     * @param {boolean} options.ignoreMounts Default `true`. If `false` enable auto sync for all mount points
     * @param {function} callback
     */
    this.enableAutoSync = (status, options, callback) => {
        options = options || {};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        if (status === autoSyncStatus && dsuObsHandler) {
            return callback();
        }

        const defaultOptions = {
            onError: () => {
            },
            onSync: () => {
            },
            ignoreMounts: true
        }

        options = {
            ...defaultOptions,
            ...options
        };

        const subscribe = (options, callback) => {
            archiveConfigurator.getKeySSI(undefined, (err, keySSI) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to retrieve keySSI", err));
                }

                dsuObsHandler = notifications.getObservableHandler(keySSI);
                dsuObsHandler.on('error', (err) => {
                    options.onError(err);
                });

                dsuObsHandler.on('message', async (message) => {
                    if (!message.ok) {
                        options.onError(new Error(`Unable to fetch notification. Code: ${message.statusCode}. Message: ${message.statusMessage}`));
                        return;
                    }

                    try {
                        message = await message.json();
                        message = JSON.parse(message.message);
                    } catch (e) {
                        options.onError(e);
                    }

                    if (typeof message !== 'object' || message.event !== 'dsu:newAnchor') {
                        // We're interested only in new anchors
                        return;
                    }

                    if (brickMapController.getLastAnchoredHashLink().getAnchorId() === message.payload) {
                        // Nothing to do: we're up to date
                        return;
                    }

                    // Load and try to merge the latest changes
                    brickMapController.mergeUpstreamChanges((err, result) => {
                        if (err) {
                            return options.onError(err);
                        }
                        options.onSync(result);
                    })
                })

                callback();
            })
        };

        const unsubscribe = (callback) => {
            dsuObsHandler && notifications.unsubscribe(dsuObsHandler);
            dsuObsHandler = null;
            callback();
        }

        const prevOptions = autoSyncOptions;

        autoSyncStatus = status;
        autoSyncOptions = (status) ? options : null;

        if (options.ignoreMounts) {
            if (autoSyncStatus) {
                return subscribe(autoSyncOptions, callback);
            }

            // When unsubscribing make sure that the previous
            // subscription ignored mounts as well, else continue
            // and unsubscribe recursively
            if (!autoSyncStatus && (!prevOptions || prevOptions.ignoreMounts)) {
                return unsubscribe(callback)
            }
        }

        let mountPoints = [];

        // Recurse in all mount points and set the auto sync settings
        const propagateAutoSyncSettings = (manifest, callback) => {
            if (!mountPoints.length) {
                return callback();
            }

            const mountPoint = mountPoints.pop();

            manifest.getArchiveForPath(mountPoint, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU instance mounted at path ${mountPoint}`, err));
                }

                result.archive.enableAutoSync(autoSyncStatus, autoSyncOptions, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to toggle auto sync for mount point: ${mountPoint}`, err));
                    }

                    propagateAutoSyncSettings(manifest, callback);
                })
            });
        }

        getManifest((err, manifest) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get manifest handler`, err));
            }

            mountPoints = manifest.getMountPoints();

            propagateAutoSyncSettings(manifest, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Unable to toggle auto sync for mounted DSUs", err));
                }

                autoSyncStatus ? subscribe(autoSyncOptions, callback)
                    : unsubscribe(callback);
            })
        });
    }

    this.stat = (path, callback) => {
        callback = $$.makeSaneCallback(callback);

        this.getArchiveForPath(path, (err, res) => {
            if (err) {
                callback(undefined, {type: undefined})
            }

            if (res.archive === this) {
                let stats;
                try {
                    stats = brickMapController.stat(path);
                } catch (e) {
                    return callback(undefined, {type: undefined})
                }

                callback(undefined, stats);
            } else {
                res.archive.stat(res.relativePath, callback);
            }
        });
    };
}

module.exports = Archive;

},{"./Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","./BrickMapController":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapController.js","./BrickStorageService":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickStorageService/index.js","./Manifest":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Manifest.js","opendsu":"opendsu","path":false,"stream":false,"swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/ArchiveConfigurator.js":[function(require,module,exports){
const storageProviders = {};
const fsAdapters = {};

function ArchiveConfigurator() {
    const config = {};
    let cache;
    let keySSI;

    this.getCreationSSI = function(plain){
        return config.keySSI.getIdentifier(plain);
    }

    this.setBufferSize = (bufferSize) => {
        if (bufferSize < 65535) {
            throw Error(`Brick size should be equal to or greater than 65535. The provided brick size is ${bufferSize}`);
        }
        config.bufferSize = bufferSize;
    };

    this.setKeySSI = (keySSI) => {
        config.keySSI = keySSI;
    };

    this.getKeySSI = (keySSIType, callback) => {
        if (typeof keySSIType === "undefined") {
            return callback(undefined, config.keySSI);
        }
        if (typeof keySSIType === "function") {
            callback = keySSIType;
            return callback(undefined, config.keySSI);
        }

        config.keySSI.getRelatedType(keySSIType, callback);
    }

    this.getDLDomain = () => {
        if (!config.keySSI) {
            return;
        }

        keySSI = config.keySSI;
        return keySSI.getDLDomain();
    }

    this.getBufferSize = () => {
        return config.bufferSize;
    };

    this.setFsAdapter = (fsAdapterName, ...args) => {
        config.fsAdapter = fsAdapters[fsAdapterName](...args);
    };

    this.getFsAdapter = () => {
        return config.fsAdapter;
    };

    this.getBrickMapId = () => {
        if (config.keySSI) {
            return config.keySSI.getAnchorId();
        }
    };

    this.setEncryptionAlgorithm = (algorithm) => {
        if (!config.encryption) {
            config.encryption = {};
        }

        config.encryption.algorithm = algorithm;
    };

    this.getEncryptionAlgorithm = () => {
        if (!config.encryption) {
            return;
        }
        return config.encryption.algorithm;
    };

    this.setEncryptionOptions = (options) => {
        if (!config.encryption) {
            config.encryption = {};
        }

        config.encryption.encOptions = options;
    };

    this.getEncryptionOptions = () => {
        if (!config.encryption) {
            return;
        }
        return config.encryption.encOptions;
    };

    this.setCompressionAlgorithm = (algorithm) => {
        if (!config.compression) {
            config.compression = {};
        }

        config.compression.algorithm = algorithm;
    };

    this.getCompressionAlgorithm = () => {
        if (!config.compression) {
            return;
        }

        return config.compression.algorithm;

    };

    this.setCompressionOptions = (options) => {
        if (!config.compression) {
            config.compression = {};
        }

        config.compression.options = options;
    };

    this.getCompressionOptions = () => {
        if (!config.compression) {
            return;
        }
        return config.compression.options;
    };

    this.setAuthTagLength = (authTagLength = 16) => {
        const encOptions = this.getEncryptionOptions();
        if (!encOptions) {
            config.encryption.encOptions = {};
        }

        config.encryption.encOptions.authTagLength = authTagLength;
    };

    this.getAuthTagLength = () => {
        if (!config.encryption || !config.encryption.encOptions) {
            return;
        }

        return config.encryption.encOptions.authTagLength;
    };

    this.setBrickMapStrategy = (strategy) => {
        config.brickMapStrategy = strategy;
    }

    this.getBrickMapStrategy = () => {
        return config.brickMapStrategy;
    }

    this.setValidationRules = (rules) => {
        config.validationRules = rules;
    }

    this.getValidationRules = () => {
        return config.validationRules;
    }

    this.getKey = (key) => {
        if (config.keySSI) {
            return config.keySSI.getKeyHash();
        }

        // @TODO: obsolete
        return this.getSeedKey();
    };

    this.getMapEncryptionKey = () => {
        if (!config.encryption) {
            return;
        }
        if (config.keySSI) {
            return config.keySSI.getEncryptionKey();
        }
    };


    this.setCache = (cacheInstance) => {
        cache = cacheInstance;
    };

    this.getCache = () => {
        return cache;
    };
}

// @TODO: obsolete
ArchiveConfigurator.prototype.registerStorageProvider = (storageProviderName, factory) => {
    storageProviders[storageProviderName] = factory;
};

ArchiveConfigurator.prototype.registerFsAdapter = (fsAdapterName, factory) => {
    fsAdapters[fsAdapterName] = factory;
};

module.exports = ArchiveConfigurator;

},{}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js":[function(require,module,exports){
const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const brickTransforms = require("./brick-transforms");

function Brick(options) {
    options = options || {};
    if (typeof options.encrypt === "undefined") {
        options.encrypt = true;
    }
    let rawData;
    let transformedData;
    let hashLink;
    let transform;
    let keySSI;

    this.setTemplateKeySSI = (templateKeySSI) => {
        options.templateKeySSI = templateKeySSI;
    };

    this.setKeySSI = (_keySSI) => {
        if (typeof _keySSI === "string") {
            _keySSI = keySSISpace.parse(_keySSI);
        }
        keySSI = _keySSI;
    };

    this.getKeySSI = () => {
        if (typeof keySSI !== "undefined") {
            return keySSI;
        }

        return generateBrickKeySSI(options);
    };

    this.getHashLink = (callback) => {
        if (typeof hashLink !== "undefined") {
            return callback(undefined, hashLink);
        }

        this.getTransformedData((err, _transformedData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
            }

            const hashFn = crypto.getCryptoFunctionForKeySSI(options.templateKeySSI, "hash");
            const _hash = hashFn(_transformedData);

            hashLink = keySSISpace.createHashLinkSSI(options.templateKeySSI.getBricksDomain(), _hash, options.templateKeySSI.getVn(), options.templateKeySSI.getHint());
            callback(undefined, hashLink);
        });
    };

    this.getAdler32 = (callback) => {
        this.getTransformedData((err, _transformedData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
            }

            callback(undefined, adler32.sum(_transformedData));
        });
    };

    this.setRawData = (data) => {
        rawData = data;
    };

    this.getRawData = (callback) => {
        if (typeof rawData !== "undefined") {
            return callback(undefined, rawData);
        }

        if (!keySSI) {
            rawData = transformedData;
            return this.getRawData(callback);
        }

        if (transformedData) {
            transform = brickTransforms.createBrickTransformation(options);
            return transform.undo(keySSI, transformedData, (err, _rawData) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to apply inverse transform`, err));
                }

                rawData = _rawData;
                callback(undefined, _rawData);
            });
        }

        callback(Error("The brick does not contain any data."));
    };

    this.setTransformedData = (data) => {
        transformedData = data;
    };

    this.getTransformedData = (callback) => {
        if (typeof transformedData !== "undefined") {
            return callback(undefined, transformedData);
        }

        if (!options.templateKeySSI.getSpecificString()) {
            transformedData = rawData;
            return this.getTransformedData(callback);
        }

        transformData((err, _transformedData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to transform data`, err));
            }

            if (typeof transformedData === "undefined") {
                if (typeof rawData !== "undefined") {
                    callback(undefined, rawData);
                } else {
                    callback(Error("The brick does not contain any data."));
                }
            } else {
                callback(undefined, transformedData);
            }
        });
    };

    this.getTransformedSize = () => {
        if (!transformedData) {
            return rawData.length;
        }

        return transformedData.length;
    };

    this.getSummary = (callback) => {
        let keySSIIdentifier = keySSI;
        if (typeof keySSIIdentifier === "object") {
            keySSIIdentifier = keySSI.getIdentifier();
        }
        const summary = {
            encryptionKey: keySSIIdentifier
        };

        this.getHashLink((err, _hashLink) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get hash link`, err));
            }

            summary.hashLink = _hashLink.getIdentifier();
            callback(undefined, summary);
        });
    }

//----------------------------------------------- internal methods -----------------------------------------------------
    function transformData(callback) {
        transform = brickTransforms.createBrickTransformation(options);
        if (rawData) {
            keySSI = generateBrickKeySSI(options);
            if (typeof keySSI === "undefined") {
                transformedData = rawData;
                return callback(undefined, rawData)
            }
            transform.do(keySSI, rawData, (err, _transformedData) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to apply direct transform`, err));
                }

                if (typeof _transformedData === "undefined") {
                    transformedData = rawData;
                } else {
                    transformedData = _transformedData;
                }

                callback(undefined, transformedData);
            });
        } else {
            callback();
        }
    }

    function generateBrickKeySSI(options) {
        if (typeof options.templateKeySSI === "undefined") {
            throw Error('A template keySSI should be provided when generating a keySSI used for brick encryption.')
        }
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        if (options.encrypt && !options.brickMap) {
            keySSI = keySSISpace.createTemplateSymmetricalEncryptionSSI(options.templateKeySSI.getDLDomain(), undefined, '', options.templateKeySSI.getVn());
        } else {
            if (options.brickMap && options.encrypt === false) {
                keySSI = keySSISpace.createTemplateSeedSSI(options.templateKeySSI.getDLDomain(), undefined, options.templateKeySSI.getControlString(), options.templateKeySSI.getVn());
            } else if (options.brickMap && options.encrypt) {
                keySSI = options.templateKeySSI;
            } else {
                keySSI = undefined;
            }
        }

        return keySSI;
    }
}

module.exports = Brick;

},{"./brick-transforms":"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/index.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js":[function(require,module,exports){
const BrickMapMixin = require('./BrickMapMixin');

/**
 * Maps file paths to bricks and metadata
 *
 * The state of the BrickMap has the following structure
 *
 * header: {
 *  metadata: {
 *      createdAt: 'utc timestamp string'
 *  },
 *  items: {
 *      folder1: {
 *          metadata: {
 *              createdAt: 'utc timestamp string'
 *          },
 *          items: {
 *              file.txt: {
 *                  metadata: {
 *                      createdAt: 'utc timestamp string',
 *                      updatedAt: 'utc timestamp string'
 *                  },
 *                  hashes: [... list of bricks hashes and check sums ...]
 *              }
 *          }
 *
 *      },
 *
 *      file2.txt: {
 *          metadata: {
 *              createdAt: 'utc timestamp string',
 *              updatedAt: 'utc timestamp string'
 *          },
 *          hashes: [... list of bricks hashes and check sums ...]
 *      }
 *  }
 * }
 *
 * @param {object|undefined} header
 */

function BrickMap(header) {
    Object.assign(this, BrickMapMixin);
    this.initialize(header);

    /**
     * Clone object/array
     */
    const clone = (obj) => {
        const cloned = Object.keys(obj).reduce((acc, key) => {
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                acc[key] = clone(obj[key]);
                return acc;
            }

            if (Array.isArray(obj[key])) {
                acc[key] = [];
                for (const i in obj[key]) {
                    if (typeof obj[key][i] === 'object' || Array.isArray(obj[key][i])) {
                        acc[key][i] = clone(obj[key][i]);
                        continue;
                    }

                    acc[key][i] = obj[key][i];
                }

                return acc;
            }

            acc[key] = obj[key];
            return acc;
        }, {});
        return cloned;
    };

    /**
     * Compare two BrickMap paths for changes
     */
    const pathChanged = (src, dst) => {
        if (this.nodeIsDirectory(src) !== this.nodeIsDirectory(dst)) {
            return true;
        }

        // Compare directories
        if (this.nodeIsDirectory(src)) {
            const srcFiles = Object.keys(src.items).sort();
            const dstFiles = Object.keys(dst.items).sort();

            if (srcFiles.length !== dstFiles.length) {
                return true;
            }

            const max = Math.max(srcFiles.length, dstFiles.length);

            for (let i = 0; i < max; i++) {
                const srcKey = srcFiles[i];
                const dstKey = dstFiles[i];


                if (srcKey !== dstKey) {
                    return true;
                }

                if (pathChanged(src.items[srcKey], dst.items[dstKey])) {
                    return true;
                }
            }
            return false;
        }

        // Compare files
        if (src.hashLinks.length !== dst.hashLinks.length) {
            return true;
        }

        const max = Math.max(src.hashLinks.length, dst.hashLinks.length);
        for (let i = 0; i < max; i++) {
            const srcHashLink = src.hashLinks[i];
            const dstHashLink = dst.hashLinks[i];

            if (typeof srcHashLink !== typeof dstHashLink) {
                return true;
            }

            const srcKeys = Object.keys(srcHashLink).sort();
            const dstKeys = Object.keys(dstHashLink).sort();
            const max = Math.max(srcKeys.length, dstKeys.length);

            for (let i = 0; i < max; i++) {
                if (srcKeys[i] !== dstKeys[i]) {
                    return true;
                }

                if (srcHashLink[srcKeys[i]] !== dstHashLink[dstKeys[i]]) {
                    return true;
                }
            }
        }

        return false;
    };


    /**
     * Merge `brickMap` items into
     * this instance
     * @param {BrickMap} brickMap
     */
    this.merge = function (brickMap) {
        const changes = this.diff(brickMap);

        if (!changes.hasItems()) {
            return;
        }

        const merge = (target, source) => {
            for (const key in source) {
                if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (typeof target[key] !== 'object' || Array.isArray(target[key])) {
                        target[key] = {};
                    }
                    merge(target[key], source[key]);
                    continue;
                }

                if (Array.isArray(source[key])) {
                    target[key] = [];
                    for (let i = 0; i < source[key].length; i++) {
                        if (typeof source[key][i] === 'object') {
                            target[key][i] = {}
                            merge(target[key][i], source[key][i])
                            continue;
                        }
                        target[key][i] = source[key][i];
                    }
                    continue;
                }

                target[key] = source[key];
            }
        };
        merge(this.header.items, changes.header.items);
        this.updateMetadata('/', 'updatedAt', this.getTimestamp());
    }

    /**
     * Return all items that changed in `brickMap`
     * compared to our version
     * @param {BrickMap} brickMap
     */
    this.diff = function (brickMap) {
        const dst = brickMap.header.items;
        const dstKeys = Object.keys(dst)
                              .filter(item => item !== 'dsu-metadata-log')
                              .sort();

        const src = this.header.items;
        const changes = {};
        for (const key of dstKeys) {
            // New items
            if (typeof src[key] === 'undefined') {
                changes[key] = clone(dst[key]);
                continue;
            }

            // Existing items
            if (pathChanged(src[key], dst[key])) {
                changes[key] = clone(dst[key]);
                continue;
            }
        }

        const brickMapDiff = new this.constructor({
            metadata: {
                createdAt: this.getTimestamp()
            },
            items: changes
        });
        return brickMapDiff;
    }

    /**
     * @param {object} operation
     * @param {string} operation.op
     * @param {string} operation.path
     * @param {string} operation.timestamp UTC string timestamp
     * @param {*} operation.data
     * @throws {Error}
     */
    this.replayOperation = function (operation) {
        const {op, path, timestamp, data} = operation;

        switch (op) {
            case 'add':
                this.appendBricksToFile(path, data);
                this.setMetadata(path, {
                    updatedAt: timestamp
                });
                break;
            case 'truncate':
                this.emptyList(path);
                this.updateMetadata(path, 'updatedAt', timestamp);
                break;
            case 'delete':
                this.delete(path);
                this.updateMetadata(path, 'deletedAt', timestamp);
                break;
            case 'copy':
                const dstPath = data;
                this.copy(path, dstPath);
                this.updateMetadata(dstPath, 'createdAt', timestamp);
                break;
            case 'createFolder':
                this.createFolder(path);
                this.updateMetadata(path, 'createdAt', timestamp);
                break;
            case 'createFile':
                this.createFile(path);
                this.updateMetadata(path, 'createdAt', timestamp);
                break;
            default:
                throw new Error(`Unknown operation <${operation}>`);
        }
    }

    /**
     * @param {BrickMap} brickMap
     * @throws {Error}
     */
    this.applyDiff = function (brickMap) {
        if (brickMap.constructor === BrickMap) {
            // This is not a BrickMapDiff so we need to merge the changes from a regular BrickMap instance
            this.merge(brickMap);
            return;
        }

        const metadata = brickMap.getMetadata('/');
        const operationsLog = metadata.log;

        if (!Array.isArray(operationsLog)) {
            throw new Error('Invalid BrickMapDiff. No replay log found');
        }

        if (!operationsLog.length) {
            return;
        }

        for (const operation of operationsLog) {
            this.replayOperation(operation, brickMap);
        }
        this.updateMetadata('/', 'updatedAt', this.getTimestamp());
        this.header.metadata.prevDiffHashLink = metadata.prevDiffHashLink;
    }

    /**
     * Check for same path conflicts
     * @param {Array<BrickMapDiff>} localChangesList
     * @return {object}
     */
    this.detectMergeConflicts = function (changes) {
        const conflicts = changes.reduce((acc, changeSet) => {
            const metadata = changeSet.getMetadata('/');
            const operationsLog = metadata.log;

            if (!Array.isArray(operationsLog)) {
                return acc;
            }

            if (!operationsLog.length) {
                return acc;
            }

            for (const operation of operationsLog) {
                switch (operation.op) {
                    case 'add':
                    case 'createFolder':
                    case 'createFile':
                    case 'truncate':
                        if (this.fileExists(operation.path)) {
                            acc[operation.path] = {
                                error: 'LOCAL_OVERWRITE',
                                message: `Path ${operation.path} will overwrite a previously anchored file or directory`,
                            }
                        }
                        break;

                    case 'copy':
                        if (this.fileDeleted(operation.path)) {
                            acc[operation.path] = {
                                error: 'REMOTE_DELETE',
                                message: `Unable to copy ${operation.path} to ${operation.data}. Source was previously deleted`
                            };
                        }

                        if (this.fileExists(operation.data)) {
                            acc[operation.data] = {
                                error: 'LOCAL_OVERWRITE',
                                message: `Unable to copy ${operation.path} to ${operation.data}. The destination path will overwrite a previously anchored file or directory`,
                            };
                        }
                        break;

                    case 'delete':
                        if (this.fileExists(operation.path)) {
                            acc[operation.path] = {
                                error: 'LOCAL_DELETE',
                                message: `Unable to delete ${operation.path}. This will delete a previously anchored file.`
                            }
                        }
                        break;

                }
            }

            return acc;
        }, {});

        if (!Object.keys(conflicts).length) {
            return;
        }
        return conflicts;
    }
}
module.exports = BrickMap;

},{"./BrickMapMixin":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapController.js":[function(require,module,exports){
'use strict';

// HTTP error code returned by the anchoring middleware
// when trying to anchor outdated changes
const ALIAS_SYNC_ERR_CODE = 428;


/**
 * The current state of the BrickMapController
 */
function State() {
    const brickMap = {
        // The latest anchored BrickMap
        anchored: undefined,
        // The current BrickMap, cloned from `anchored`. Contains un-anchored changes
        dirty: undefined,
    };
    const diffs = {
        inAnchoring: [], // BrickMapDiff objects which are in the process of anchoring
        new: [], // BrickMapDiff objects which haven't been scheduled for anchoring
        current: undefined, // A reference to the current BrickMapDiff
        latestHash: undefined // Used for chaining multiple BrickMapDiff objects
    };
    let lastAnchoredHashLink = undefined;

    this.init = (anchoredBrickMap, latestHashLink, callback) => {
        if (typeof latestHashLink === 'function') {
            callback = latestHashLink;
            latestHashLink = undefined;
        }

        brickMap.anchored = anchoredBrickMap;
        this.cloneAnchoredBrickMap((err, clone) => {
            if (err) {
                return callback(err);
            }
            brickMap.dirty = clone;
            lastAnchoredHashLink = latestHashLink;
            diffs.latestHash = latestHashLink;
            callback();
        });
    }

    /**
     * @return {boolean}
     */
    this.canBeAnchored = () => {
        return this.hasNewDiffs() || this.hasDiffsForAnchoring();
    }

    /**
     * @return {Array<BrickMapDiff>}
     */
    this.getDiffsForAnchoring = () => {
        return diffs.inAnchoring;
    }

    /**
     * @param {BrickMap} anchoredBrickMap
     */
    this.setAnchoredBrickMap = (anchoredBrickMap) => {
        brickMap.anchored = anchoredBrickMap;
    }

    /**
     * @return {BrickMap}
     */
    this.getAnchoredBrickMap = () => {
        return brickMap.anchored;
    }

    /**
     * @return {BrickMapDiff}
     */
    this.getCurrentDiff = () => {
        return diffs.current;
    }

    /**
     * @param {BrickMapDiff} diff
     */
    this.setCurrentDiff = (diff) => {
        diffs.current = diff;
    }

    /**
     * Returns the BrickMap containing un-anchored changes
     * @return {BrickMap}
     */
    this.getDirtyBrickMap = () => {
        return brickMap.dirty;
    }

    /**
     * @param {BrickMap} dirtyBrickMap
     */
    this.setDirtyBrickMap = (dirtyBrickMap) => {
        brickMap.dirty = dirtyBrickMap;
    }

    /**
     * Returns the latest BrickMapDiff in the "new" list
     * @return {BrickMapDiff}
     */
    this.getLastestNewDiff = () => {
        const newDiffsLength = diffs.new.length;
        return diffs.new[newDiffsLength - 1];
    }

    /**
     * @param {BrickMapDiff} diff
     */
    this.pushNewDiff = (diff) => {
        diffs.new.push(diff);
    }

    this.getLastAnchoredHashLink = () => {
        return lastAnchoredHashLink;
    }

    this.setLastAnchoredHashLink = (hashLink) => {
        lastAnchoredHashLink = hashLink;
    }

    this.getLatestDiffHashLink = () => {
        return diffs.latestHash;
    }

    this.setLatestDiffHashLink = (hashLink) => {
        diffs.latestHash = hashLink;
    }

    /**
     * @return {boolean}
     */
    this.hasNewDiffs = () => {
        return diffs.new.length > 0;
    }

    /**
     * @return {boolean}
     */
    this.hasDiffsForAnchoring = () => {
        return diffs.inAnchoring.length > 0;
    }

    /**
     * Moves the BrickMapDiffs from the 'new' array to the 'inAnchoring' array
     * @param {function} callback
     */
    this.prepareNewChangesForAnchoring = (callback) => {
        if (!this.hasNewDiffs()) {
            return callback();
        }

        const diff = diffs.new.shift();
        diff.getHashLink((err, lastDiffHashLink) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get hashLink`, err));
            }

            diffs.latestHash = lastDiffHashLink;
            diffs.inAnchoring.push(diff);
            this.prepareNewChangesForAnchoring(callback);
        });
    }

    this.rollback = (mergedDiffs) => {
        diffs.inAnchoring.unshift(...mergedDiffs);
    }

    /**
     * Clone the anchored brickmap
     * @param {function} callback
     */
    this.cloneAnchoredBrickMap = (callback) => {
        brickMap.anchored.clone((err, brickMap) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to clone BrickMap`, err));
            }
            callback(undefined, brickMap);
        })
    }
}

/**
 * BrickMap Proxy
 *
 * Handles loading and anchoring a BrickMap using the provided BrickMapStrategy
 * in the ArchiveConfigurator
 *
 * BrickMap write operations are proxied to a copy of a valid BrickMap and to a BrickMapDiff
 * used later for anchoring. The reason for that is to preserve read consistency during
 * a session. Writing only to a BrickMapDiff object will cause subsequent reads to fail;
 * in order to simplify the implementation the same "write" operation is written to the
 * "dirty" BrickMap and to the BrickMapDiff object (only this object will be anchored). Any
 * read operations will go directly to the "dirty" BrickMap.
 *
 * After anchoring any changes, the anchored BrickMap is updated with the changes stored in BrickMapDiff
 * thus being in sync with the "dirty" copy
 *
 * @param {object} options
 * @param {ArchiveConfigurator} options.config
 * @param {BrickStorageService} options.brickStorageService
 */
function BrickMapController(options) {
    const swarmutils = require("swarmutils");
    const BrickMap = require('./BrickMap');
    const Brick = require('./Brick');
    const AnchorValidator = require('./AnchorValidator');
    const pskPth = swarmutils.path;
    const BrickMapDiff = require('./BrickMapDiff');
    const BrickMapStrategyFactory = require('./BrickMapStrategy');
    const anchoringStatus = require('./constants').anchoringStatus;
    const openDSU = require("opendsu");
    const bricking = openDSU.loadAPI("bricking");
    const anchoring = openDSU.loadAPI("anchoring");
    const notifications = openDSU.loadAPI("notifications");
    options = options || {};

    const config = options.config;
    const keySSI = options.keySSI;
    const brickStorageService = options.brickStorageService;
    const keyssi = openDSU.loadApi("keyssi");
    if (!config) {
        throw new Error('An ArchiveConfigurator is required!');
    }

    if (!brickStorageService) {
        throw new Error('BrickStorageService is required');
    }

    let anchoringInProgress = false;

    let publishAnchoringNotifications = false;
    let autoSync = false;
    let dsuObsHandler;
    let autoSyncOptions = {};

    let strategy = config.getBrickMapStrategy();
    let validator = new AnchorValidator({
        rules: config.getValidationRules()
    });
    const state = new State();


    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////

    /**
     * Configure the strategy and create
     * proxy methods for BrickMap
     */
    const initialize = () => {
        if (!strategy) {
            strategy = getDefaultStrategy();
        }
        strategy.setCache(config.getCache());
        strategy.setBrickMapController(this);
        strategy.setBrickMapState(state);
        strategy.setValidator(validator);

        const brickMap = new BrickMap();
        const brickMapProperties = Object.getOwnPropertyNames(brickMap);
        for (const propertyName of brickMapProperties) {
            if (typeof brickMap[propertyName] !== 'function' || propertyName === 'load') {
                continue;
            }
            // Proxy method calls to BrickMap through BrickMapController
            const method = propertyName;
            this[propertyName] = new Proxy(function () {
            }, {
                apply: (...args) => {
                    const targetHandlerName = `${method}ProxyHandler`;

                    if (typeof this[targetHandlerName] === 'function') {
                        return this[targetHandlerName](...args.pop());
                    }

                    const dirtyBrickMap = state.getDirtyBrickMap();
                    return dirtyBrickMap[method].apply(dirtyBrickMap, args.pop());
                }
            });
        }
    }

    /**
     * @return {BrickMapStrategyMixin}
     */
    const getDefaultStrategy = () => {
        const factory = new BrickMapStrategyFactory();
        const strategy = factory.create();

        return strategy;
    }

    const createBrickMapDiff = (data, callback) => {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }

        const brickMapDiff = new BrickMapDiff(data);
        if (typeof data !== 'undefined') {
            return this.configureBrickMap(brickMapDiff, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to configure brickMap`, err));
                }
                callback(undefined, brickMapDiff);
            });
        }
        brickMapDiff.initialize((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to initialize brickMapDiff`, err));
            }

            brickMapDiff.setPrevDiffHashLink(state.getLatestDiffHashLink());
            this.configureBrickMap(brickMapDiff, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to configure brickMap`, err));
                }
                callback(undefined, brickMapDiff);
            });
        });
    }

    /**
     * Returns the latest BrickMapDiff that
     * hasn't been scheduled for anchoring
     *
     * Write operations will be added into this object
     *
     * If no such object exists, a new object is created
     * and push into the list
     *
     * @return {BrickMapDiff}
     */
    const getCurrentDiffBrickMap = (callback) => {
        let brickMapDiff = state.getLastestNewDiff();
        if (!brickMapDiff) {
            return createBrickMapDiff((err, brickMapDiff) => {
                if (err) {
                    return callback(err);
                }

                state.setCurrentDiff(brickMapDiff);
                state.pushNewDiff(brickMapDiff);
                callback(undefined, brickMapDiff);
            })
        }

        state.setCurrentDiff(brickMapDiff);
        callback(undefined, brickMapDiff);
    }

    const notifySubscribers = (hashLink, callback) => {
        const message = {
            event: "dsu:newAnchor",
            payload: hashLink.getAnchorId()
        };

        notifications.publish(keySSI, message, 0, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to publish anchoring notification`, err));
            }

            callback();
        });
    }

    /**
     * Release the "anchoringInProgress" lock
     * and notify the anchoring listener of
     * the status and data of the current anchoring process
     *
     * To preserve backwards compatibility with the existing
     * code, the listener is called in the same way as
     *  the classic NodeJS callback convention: callback(err, result)
     *
     * If the anchoring status is OK, the listener is called as: listener(undefined, anchoringResult)
     * If the anchoring process has failed, the `status` parameter will contain
     * the error type (string) and the `data` parameter will contain
     * the actual error object. The error type is added as a property
     * tot the error object and the listener will be called as: listener(err)
     *
     * @param {callback} listener
     * @param {number} status
     * @param {*} data
     */
    const endAnchoring = (listener, status, data) => {
        anchoringInProgress = false;

        if (status === anchoringStatus.OK) {
            if (!publishAnchoringNotifications) {
                return listener(undefined, data);
            }

            return notifySubscribers(data, (err) => {
                if (err) {
                    console.warn("Unable to publish anchoring notification");
                    console.error(err);
                }

                return listener(undefined, data);
            });
        }

        if (status === anchoringStatus.BRICKMAP_RECONCILIATION_HANDOFF) {
            return listener(undefined, data);
        }

        const error = data;
        error.type = status;
        listener(error);
    }

    /**
     * Returns true if any BrickMapDiff objects
     * exist in the pending state.
     *
     * This function is used to determine if a new anchoring
     * process should be started after the current one has ended
     *
     * @return {boolean}
     */
    const anchoringRequestExists = () => {
        return state.hasDiffsForAnchoring();
    }

    /**
     * Returns true if the anchoring service returned an 'out of sync' error
     * @return {boolean}
     */
    const isAliasSyncError = (err) => {
        let error = err;
        do {
            if (error.statusCode === ALIAS_SYNC_ERR_CODE) {
                return true;
            }

            error = error.previousError;
        } while (error && (error.previousError || error.statusCode));
        return false;
    }

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * Create an empty BrickMap
     */
    this.init = (callback) => {
        this.createBrickMap((err, brickMap) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create new brickMap`, err));
            }

            state.init(brickMap, callback);
        });
    }

    /**
     * Load an existing BrickMap using the BrickMap strategy
     */
    this.load = (callback) => {
        strategy.load(keySSI, (err, brickMap) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load brickMap`, err));
            }


            state.init(brickMap, strategy.getLastHashLink(), callback);
        });
    }

    /**
     * @param {string} path
     * @param {Array<object>} bricksData
     * @param {callback} callback
     */
    this.addFile = (path, bricksData, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'addFile', path, {
            bricksData
        }, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate addFile operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                this.addFileEntry(path, bricksData);
                this.attemptAnchoring(callback);
            });
        })
    }

    /**
     * @param {string} srcPath
     * @param {string} dstPath
     * @param {callback} callback
     */
    this.renameFile = (srcPath, dstPath, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'rename', srcPath, {
            dstPath
        }, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate rename operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }
                try {
                    this.copy(srcPath, dstPath);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to copy`, e));
                }
                this.delete(srcPath);
                this.attemptAnchoring(callback);
            })
        })
    }
    /**
     * @param {string} srcPath
     * @param {string} dstPath
     * @param {callback} callback
     */
    this.cloneFolder = (srcPath, dstPath, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'clone', srcPath, {
            dstPath
        }, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate copy operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }
                try {
                    this.copy(srcPath, dstPath);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to copy`, e));
                }

                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * @param {string} path
     * @param {Array<object>} bricksData
     * @param {callback} callback
     */
    this.appendToFile = (path, bricksData, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'appendToFile', path, {
            bricksData
        }, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate appendToFile operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                this.appendBricksToFile(path, bricksData);
                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * @param {string} path
     * @param {Array<object>} filesBricksData
     * @param {callback} callback
     */
    this.addFiles = (path, filesBricksData, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'addFiles', path, {
            filesBricksData
        }, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate addFiles operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                for (const filePath in filesBricksData) {
                    const bricks = filesBricksData[filePath];
                    this.addFileEntry(pskPth.join(path, filePath), bricks);
                }
                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * @param {string} path
     * @param {callback} callback
     */
    this.deleteFile = (path, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'deleteFile', path, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate deleteFile operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                try {
                    this.delete(path);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to delete`, e));
                }
                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * @param {string} path
     * @param {callback} callback
     */
    this.createDirectory = (path, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'createFolder', path, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate createFolder operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                try {
                    this.createFolder(path);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create folder ${path}`, e));
                }
                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * @param {string} path
     * @param {callback} callback
     */
    this.createEmptyFile = (path, callback) => {
        validator.validate('preWrite', state.getDirtyBrickMap(), 'createFile', path, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate createFile operation`, err));
            }

            getCurrentDiffBrickMap((err, _brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve current diffBrickMap`, err));
                }

                try {
                    this.createFile(path);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create file ${path}`, e));
                }
                this.attemptAnchoring(callback);
            })
        })
    }

    /**
     * Proxy for BatMap.addFileEntry()
     *
     * @param {string} path
     * @param {Array<object>} bricks
     * @throws {Error}
     */
    this.addFileEntryProxyHandler = (path, bricks) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        let truncateFileIfExists = false;
        if (!dirtyBrickMap.isEmpty(path)) {
            truncateFileIfExists = true;
        }

        dirtyBrickMap.addFileEntry(path, bricks);
        if (truncateFileIfExists) {
            state.getCurrentDiff().emptyList(path);
        }
        state.getCurrentDiff().addFileEntry(path, bricks);
    }

    /**
     * Proxy for BrickMap.appendBricksToFile()
     *
     * @param {string} path
     * @param {Array<object>} bricks
     * @throws {Error}
     */
    this.appendBricksToFileProxyHandler = (path, bricks) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        dirtyBrickMap.appendBricksToFile(path, bricks);
        state.getCurrentDiff().appendBricksToFile(path, bricks);
    }

    /**
     * Proxy for BrickMap.delete();
     *
     * @param {string} path
     * @throws {Error}
     */
    this.deleteProxyHandler = (path) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        dirtyBrickMap.delete(path);
        state.getCurrentDiff().delete(path);
    }

    /**
     * Proxy for BrickMap.copy()
     *
     * @param {string} srcPath
     * @param {string} dstPath
     * @throws {Error}
     */
    this.copyProxyHandler = (srcPath, dstPath) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        dirtyBrickMap.copy(srcPath, dstPath);
        state.getCurrentDiff().copy(srcPath, dstPath);
    }

    /**
     * Proxy for BrickMap.createFolder()
     *
     * @param {string} path
     */
    this.createFolderProxyHandler = (path) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        dirtyBrickMap.createFolder(path);
        state.getCurrentDiff().createFolder(path);
    }

    /**
     * Proxy for BrickMap.createFile()
     *
     * @param {string} path
     */
    this.createFileProxyHandler = (path) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        dirtyBrickMap.createFile(path);
        state.getCurrentDiff().createFile(path);
    }

    /**
     * Persists a BrickMap Brick
     *
     * @param {BrickMap} brickMap
     * @param {callback} callback
     */
    this.saveBrickMap = (domain, brickMap, callback) => {
        const brickMapBrick = brickMap.toBrick();
        brickMapBrick.setKeySSI(brickMap.getBrickEncryptionKeySSI());
        brickMapBrick.getTransformedData((err, brickData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brickMap brick's transformed data`, err));
            }

            bricking.putBrick(domain, brickData, callback);
        });
    }

    /**
     * @param {Brick|undefined} brick
     * @param {function} callback
     */
    this.createBrickMap = (brick, callback) => {
        if (typeof brick === "function") {
            callback = brick;
            brick = undefined;
        }

        const brickMap = new BrickMap(brick);
        this.configureBrickMap(brickMap, (err => callback(err, brickMap)));
    }

    /**
     * @param {Brick|undefined} brick
     * @return {function} callback
     */
    this.createBrickMapDiff = (brick, callback) => {
        return createBrickMapDiff(brick, callback);
    }

    /**
     * @param {BrickMap} brickMap
     * @param callback
     */
    this.configureBrickMap = (brickMap, callback) => {
        if (!brickMap.getTemplateKeySSI()) {
            brickMap.setKeySSI(keySSI);
        }

        brickMap.load(callback);
    }

    /**
     * @param {object} rules
     * @param {object} rules.preWrite
     * @param {object} rules.afterLoad
     */
    this.setValidationRules = (rules) => {
        validator.setRules(rules);
    }

    /**
     * Start the anchoring process only
     * if the BrickMapStrategy decides it's time
     *
     * @param {callback} callback
     */
    this.attemptAnchoring = (callback) => {
        const dirtyBrickMap = state.getDirtyBrickMap();
        strategy.ifChangesShouldBeAnchored(dirtyBrickMap, (err, shouldBeAnchored) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to determine if changes should be anchored`, err));
            }

            if (!shouldBeAnchored) {
                return callback();
            }

            // In order to preserve backwards compatibility
            // with the existing code, if no "anchoring event listener"
            // is set, use the `callback` as a listener
            const anchoringEventListener = strategy.getAnchoringEventListener(callback);
            if (anchoringEventListener !== callback) {
                // Resume execution and perform the anchoring in the background
                // When anchoring has been done the `anchoringEventListener` will be notified
                callback();
            }

            this.anchorChanges(anchoringEventListener);
        });
    }

    /**
     * @param {callback} listener
     * @param {BrickMap|undefined} brickMap
     */
    this.anchorChanges = (listener, brickMap) => {
        if (anchoringInProgress || (!state.canBeAnchored() && !brickMap)) {
            return listener();
        }

        anchoringInProgress = true;

        // Use the strategy to compact/merge any BrickMapDiff objects into a single
        // BrickMap instance
        strategy.compactDiffs(brickMap, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(listener)(createOpenDSUErrorWrapper(`Failed to compact diffs`, err));
            }

            const [brickMap, mergedDiffs] = result;
            const bricksDomain = keySSI.getBricksDomain();
            this.saveBrickMap(bricksDomain, brickMap, (err, hash) => {
                if (err) {
                    state.rollback(mergedDiffs);
                    return endAnchoring(listener, anchoringStatus.PERSIST_BRICKMAP_ERR, err);
                }

                const timestamp = Date.now();
                const hashLink = keyssi.createHashLinkSSI(bricksDomain, hash, keySSI.getVn(), keySSI.getHint());
                let dataToSign = timestamp;
                if (state.getLastAnchoredHashLink()) {
                    dataToSign = state.getLastAnchoredHashLink().getIdentifier() + timestamp;
                }
                dataToSign += keySSI.getAnchorId();
                keySSI.sign(dataToSign, (err, signature) => {
                    if (err) {
                        return OpenDSUSafeCallback(listener)(createOpenDSUErrorWrapper(`Failed to sign data`, err));
                    }

                    //signedHashLink should not contain any hint because is not trusted
                    const signedHashLink = keyssi.createSignedHashLinkSSI(bricksDomain, hashLink.getHash(), timestamp, signature, keySSI.getVn());

                    const updateAnchorCallback = (err) => {
                        if (err) {
                            // In case of any errors, the compacted BrickMapDiff objects
                            // are put back into the "pending anchoring" state in case
                            // we need to retry the anchoring process
                            state.rollback(mergedDiffs);

                            // The anchoring middleware detected that we were trying
                            // to anchor outdated changes. In order to finish the anchoring
                            // process the conflict must be first resolved
                            if (isAliasSyncError(err)) {
                                return this.handleAnchoringConflict(listener);
                            }

                            return endAnchoring(listener, anchoringStatus.ANCHOR_VERSION_ERR, err);
                        }

                        // After the alias is updated, the strategy is tasked
                        // with updating our anchored BrickMap with the new changes
                        strategy.afterBrickMapAnchoring(brickMap, signedHashLink, (err, hashLink) => {
                            if (err) {
                                return endAnchoring(listener, anchoringStatus.BRICKMAP_UPDATE_ERR, err);
                            }

                            endAnchoring(listener, anchoringStatus.OK, hashLink);

                            if (anchoringRequestExists()) {
                                // Another anchoring was requested during the time this one
                                // was in progress, as such, we start the process again
                                this.anchorChanges(listener);
                            }
                        });
                    }

                    const lastAnchoredHashLink = state.getLastAnchoredHashLink();
                    /*if (!lastAnchoredHashLink) {
                        anchoring.createAnchor(keySSI, (err) => {
                            if (err) {
                                return OpenDSUSafeCallback(listener)(createOpenDSUErrorWrapper(`Failed to create anchor`, err));
                            }

                            anchoring.appendToAnchor(keySSI, signedHashLink, '', updateAnchorCallback);
                        });
                    } else {
                        anchoring.appendToAnchor(keySSI, signedHashLink, lastAnchoredHashLink, updateAnchorCallback);
                    }*/
                    //TODO: update the smart contract and after that uncomment the above code and eliminate the following if statement
                    if (!lastAnchoredHashLink) {
                        anchoring.getAllVersions(keySSI, (err, versions)=>{
                            if(err){
                                return OpenDSUSafeCallback(listener)(createOpenDSUErrorWrapper(`Failed to retrieve versions of anchor`, err));
                            }

                            if (versions && versions.length === 0) {
                                return anchoring.appendToAnchor(keySSI, signedHashLink, null, updateAnchorCallback);
                            }
                            return OpenDSUSafeCallback(listener)(createOpenDSUErrorWrapper(`Failed to create anchor`, err));
                        });
                    } else {
                        anchoring.appendToAnchor(keySSI, signedHashLink, lastAnchoredHashLink, updateAnchorCallback);
                    }
                })
            })
        });
    }

    /**
     * If an anchoring conflict occurs, reload our anchored BrickMap
     * in order to get the new changes and then try to merge our BrickMapDiff
     * instances
     *
     * @param {callback} listener
     */
    this.handleAnchoringConflict = (listener) => {
        const currentAnchoredHashLinkSSI = strategy.getLastHashLink();
        strategy.load(keySSI, (err, brickMap) => {
            if (err) {
                return endAnchoring(listener, anchoringStatus.BRICKMAP_LOAD_ERR, err);
            }
            state.setLastAnchoredHashLink(strategy.getLastHashLink());

            // Try and merge our changes
            strategy.reconcile(brickMap, currentAnchoredHashLinkSSI, (err, result) => {
                if (err) {
                    return endAnchoring(listener, anchoringStatus.BRICKMAP_RECONCILE_ERR, err);
                }

                anchoringInProgress = false;

                if (!result.status) {
                    return endAnchoring(listener, anchoringStatus.BRICKMAP_RECONCILIATION_HANDOFF)
                }
                this.anchorChanges(listener, result.brickMap);
            });
        });
    }

    /**
     * @return {boolean}
     */
    this.hasUnanchoredChanges = () => {
        return state.hasNewDiffs() || anchoringRequestExists();
    }

    /**
     * @return {object}
     */
    this.getState = () => {
        return state;
    }

    this.getLastAnchoredHashLink = () => {
        return state.getLastAnchoredHashLink();
    }


    /**
     * Toggle notifications publishing for new anchors
     * @param {boolean} status
     */
    this.enableAnchoringNotifications = (status) => {
        publishAnchoringNotifications = status;
    }

    /**
     * @return {boolean}
     */
    this.anchoringNotificationsEnabled = () => {
        return publishAnchoringNotifications;
    }

    /**
     * Load the latest BrickMaps then try and merge
     * the latest changes
     * @param {function} callback
     */
    this.mergeUpstreamChanges = (callback) => {
        const currentAnchoredHashLinkSSI = strategy.getLastHashLink();
        strategy.load(keySSI, (err, brickMap) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load brickMap`, err));
            }

            strategy.merge(brickMap, currentAnchoredHashLinkSSI, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to merge latest DSU changes`, err));
                }


                callback(undefined, result.status);
            })
        })
    }

    initialize();
}

module.exports = BrickMapController;

},{"./AnchorValidator":"/home/runner/work/privatesky/privatesky/modules/bar/lib/AnchorValidator.js","./Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","./BrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js","./BrickMapDiff":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapDiff.js","./BrickMapStrategy":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/index.js","./constants":"/home/runner/work/privatesky/privatesky/modules/bar/lib/constants.js","opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapDiff.js":[function(require,module,exports){
'use strict';

const BrickMapMixin = require('./BrickMapMixin');

/**
 * Auguments a BrickMap with an operations
 * log
 * @param {object} options
 * @param {string} options.prevDiffHash
 */
function BrickMapDiff(header) {
    Object.assign(this, BrickMapMixin);
    this.initialize(header);

    this.initialize = function (header, callback) {
        if (typeof header === "function") {
            callback = header;
            header = undefined;
        }

        BrickMapMixin.initialize.call(this, header);
        this.load((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load BrickMapDiff`, err));
            }

            if (!this.header.metadata.log) {
                this.header.metadata.log = [];
            }

            callback();
        });
    }

    /**
     * @param {BrickMapDiff} brickMap
     * @throws {Error}
     */
    this.applyDiff = function (brickMap) {
        if (brickMap.constructor !== BrickMapDiff) {
            throw new Error('Unable to merge: expected a BrickMapDiff instance')
        }

        const metadata = brickMap.getMetadata('/');
        const operationsLog = metadata.log;

        if (!Array.isArray(operationsLog)) {
            throw new Error('Invalid BrickMapDiff. No replay log found');
        }

        if (!operationsLog.length) {
            return;
        }

        for (const operation of operationsLog) {
            const data = (typeof operation.data !== 'undefined') ? JSON.parse(JSON.stringify(operation.data))
                                                                 : operation.data;
            this.log(operation.op, operation.path, data);
        }
        this.updateMetadata('/', 'updatedAt', this.getTimestamp());
    }

    /**
     * @return {boolean}
     */
    this.hasItems = function () {
        return this.header.metadata.log.length > 0;
    };

    this.setPrevDiffHashLink = function (hashLink) {
        if (typeof hashLink === 'undefined') {
            return;
        }
        this.header.metadata.prevDiffHashLink = hashLink.getIdentifier();
    }

    /**
     * @param {string} op
     * @param {string} path
     * @param {object|undefined} data
     */
    this.log = function (op, path, data) {
        const timestamp = this.getTimestamp()
        this.header.metadata.log.push({ op, path, timestamp, data });
    }

    /**
     * @param {string} path
     * @param {Array<object>} bricks
     */
    this.addFileEntry = function (path, bricks) {
        this.log('add', path, bricks);
    }

    /**
     * @param {string} path
     * @param {Array<object>} bricks
     */
    this.appendBricksToFile = function (path, bricks) {
        this.log('add', path, bricks);
    }

    /**
     * @param {string} path
     */
    this.emptyList = function (path) {
        this.log('truncate', path);
    }

    /**
     * @param {string} path
     */
    this.delete = function (path) {
        this.log('delete', path);
    }

    /**
     * @param {string} srcPath
     * @param {string} dstPath
     */
    this.copy = function (srcPath, dstPath) {
        this.log('copy', srcPath, dstPath)
    }

    /**
     * @param {string} path
     */
    this.createFolder = function (path) {
        this.log('createFolder', path);
    }

    /**
     * @param {string} path
     */
    this.createFile = function (path) {
        this.log('createFile', path);
    }
}
module.exports = BrickMapDiff;

},{"./BrickMapMixin":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapMixin.js":[function(require,module,exports){
'use strict';

const Brick = require("./Brick");
const pskPath = require("swarmutils").path;
const pathModule = "path";
let path;
try {
    path = require(pathModule);
} catch (err) {
} finally {
    if (typeof path === "undefined") {
        path = {sep: "/"};
    }
}

const BrickMapMixin = {
    header: null,
    templateKeySSI: null,

    /**
     * @param {Brick|string|object} header
     */
    initialize: function (header) {
        this.header = header;
        if (this.header) {
            return;
        }

        this.header = {
            items: {},
            metadata: {
                createdAt: this.getTimestamp()
            }
        }
    },

    /**
     * @return {boolean}
     */
    hasItems: function () {
        return Object.keys(this.header.items).length > 0;
    },

    /**
     * @return {string}
     */
    getTimestamp: function () {
        return new Date().toUTCString();
    },

    /**
     * @param {object} node
     * @param {object} brick
     */
    appendBrick: function (node, brick) {
        node.metadata.updatedAt = this.getTimestamp();
        node.hashLinks.push(brick);
    },

    /**
     * @param {object} parent
     * @param {string} name
     */
    createFileNode: function (parent, name) {
        parent.items[name] = {
            hashLinks: [],
            metadata: {
                createdAt: this.getTimestamp()
            }
        }
    },

    /**
     * @param {object} root
     * @param {string} name
     */
    createDirectoryNode: function (root, name) {
        root.items[name] = {
            metadata: {
                createdAt: this.getTimestamp()
            },
            items: {}
        }
    },

    /**
     * Create all the nodes required to traverse `path`
     * and return the deepest node in the tree
     *
     * @param {string} path
     * @param {object} options
     * @param {string} options.trailingNodeType Possible values are 'child' or 'parent'
     * @return {object}
     */
    createNodesFromPath: function (path, options) {
        options = options || {
            trailingNodeType: 'child',
            addCreatedAtTimestamp: true
        };

        const pathSegments = path.split('/');

        let parentNode = this.header;
        let nodeName;

        while (pathSegments.length) {
            nodeName = pathSegments.shift();
            if (nodeName === "") {
                nodeName = pathSegments.shift();
            }

            if (parentNode.items[nodeName]) {
                delete parentNode.items[nodeName].metadata.deletedAt;
            }

            if (!pathSegments.length) {
                break;
            }

            // remove the "deletedAt" attribute in case we're trying
            // to add an entry in a previously deleted location
            delete parentNode.metadata.deletedAt;

            if (!parentNode.items[nodeName]) {
                this.createDirectoryNode(parentNode, nodeName);
            }
            parentNode = parentNode.items[nodeName];
        }

        if (!parentNode.items[nodeName]) {
            if (options.trailingNodeType === 'child') {
                this.createFileNode(parentNode, nodeName);
            } else {
                this.createDirectoryNode(parentNode, nodeName);
            }
        }

        return parentNode.items[nodeName];
    },

    /**
     * @param {string} nodePath
     * @return {string} Returns a parent directory's path
     */
    dirname: function (path) {
        const segments = path.split('/');
        return segments.slice(0, -1).join('/');
    },

    /**
     * @param {string} nodePath
     * @return {string} Returns trailing name component of a path
     */
    basename: function (path) {
        const segments = path.split('/');
        return segments.pop();
    },

    /**
     * @param {object} node
     * @return {boolean}
     */
    nodeIsDeleted: function (node) {
        return typeof node.metadata.deletedAt !== 'undefined';
    },

    /**
     * @param {object} node
     * @return {boolean}
     */
    nodeIsDirectory: function (node) {
        return typeof node.items === 'object';
    },

    /**
     * @param {object} node
     */
    deleteNode: function (node) {
        node.metadata.deletedAt = this.getTimestamp();
        if (this.nodeIsDirectory(node)) {
            node.items = {};
            return;
        }

        node.hashLinks = [];
    },

    /**
     * @param {object} node
     */
    truncateNode: function (node) {
        delete node.metadata.deletedAt;
        node.metadata.updatedAt = this.getTimestamp();
        if (this.nodeIsDirectory(node)) {
            node.items = {};
        }

        node.hashLinks = [];
    },

    /**
     * Traverse the nodes identified by `toPath`
     * and return the deepest parent node in the tree
     *
     * @param {string} toPath
     * @return {object|undefined}
     */
    navigate: function (toPath) {
        let parentNode = this.header;
        const segments = toPath.split("/");

        for (let i in segments) {
            let segment = segments[i];
            if (!segment) {
                continue;
            }


            if (typeof parentNode.items[segment] === 'undefined') {
                return;
            }

            if (this.nodeIsDirectory(parentNode.items[segment])) {
                parentNode = parentNode.items[segment];
                continue;
            }
        }

        return parentNode;
    },

    /**
     * Traverse `path` and return the deepest node
     * in the tree
     *
     * @param {string} path
     * @return {object}
     */
    getDeepestNode: function (path) {
        path = pskPath.normalize(path);
        if (path === '/') {
            return this.header;
        }

        const filename = this.basename(path);
        const dirPath = this.dirname(path);

        const parentNode = this.navigate(dirPath);

        if (!parentNode) {
            return;
        }

        return parentNode.items[filename];
    },


    /**
     * @param {string} path
     * @param {Array<object>} bricks
     */
    addFileEntry: function (path, bricks) {
        if (!this.isEmpty(path)) {
            this.emptyList(path);
        }

        this.appendBricksToFile(path, bricks);
    },

    /**
     * @param {string} path
     * @param {Array<object>} bricks
     */
    appendBricksToFile: function (path, bricks) {
        for (const data of bricks) {
            this.add(path, data);
        }
    },

    /**
     * Add brick data for `filePath`
     *
     * @param {string} filePath
     * @param {object} brick
     * @param {string} brick.hash
     * @param {object} brick.encryptionKey
     * @param {string} brick.checkSum
     *
     * @throws {Error}
     */
    add: function (filePath, brick) {
        filePath = pskPath.normalize(filePath);
        if (filePath === "") {
            throw new Error("Invalid path");
        }

        const brickObj = {
            checkSum: brick.checkSum,
            hashLink: brick.hashLink
        };

        if (brick.encryptionKey) {
            brickObj.key = brick.encryptionKey
        }

        const filePathNode = this.createNodesFromPath(filePath);
        // If this node was previously deleted, remove the "deletedAt" timestamp
        if (filePathNode.metadata.deletedAt) {
            delete filePathNode.metadata.deletedAt;
        }
        this.appendBrick(filePathNode, brickObj);
    },

    /**
     * @param {string} barPath
     * @throws {Error}
     */
    delete: function (barPath) {
        barPath = pskPath.normalize(barPath);
        const childNode = this.getDeepestNode(barPath);
        if (!childNode || this.nodeIsDeleted(childNode)) {
            throw new Error(`Invalid path <${barPath}>`);
        }

        this.deleteNode(childNode);
    },

    createNode: function (barPath, options) {
        barPath = pskPath.normalize(barPath);

        if (barPath === '/') {
            throw new Error('Invalid path: /');
        }

        const dirName = this.basename(barPath);
        const dirPath = this.dirname(barPath);
        const parentDir = this.getDeepestNode(dirPath);

        if (!dirName) {
            throw new Error('Missing folder name');
        }

        if (dirPath && parentDir) {
            if (!this.nodeIsDirectory(parentDir)) {
                throw new Error('Unable to create a folder in a file');
            }

            if (typeof parentDir.items[dirName] !== 'undefined' && options.trailingNodeType === "parent") {
                throw new Error('Unable to create folder. A file or folder already exists in that location.');
            }
        }

        this.createNodesFromPath(barPath, options);
    },
    /**
     * Create an empty directory
     *
     * @param {string} barPath
     * @throws {Error}
     */
    createFolder: function (barPath) {
        this.createNode(barPath, {trailingNodeType: "parent"});
    },

    createFile: function (barPath) {
        this.createNode(barPath, {trailingNodeType: "child"});
    },
    /**
     * @param {string} filePath
     * @return {Array<object>}
     * @throws {Error}
     */
    getBricksMeta: function (filePath) {
        const fileNode = this.getDeepestNode(filePath);
        if (!fileNode) {
            throw new Error(`Path <${filePath}> not found`);
        }
        if (this.nodeIsDirectory(fileNode)) {
            throw new Error(`Path <${filePath}> is a folder`);
        }

        if (this.nodeIsDeleted(fileNode)) {
            throw new Error(`Path <${filePath}> not found`);
        }

        return fileNode.hashLinks;
    },

    /**
     * @param {string} filePath
     * @return {Array<string>}
     * @throws {Error}
     */
    getHashList: function (filePath) {
        if (filePath === "") {
            throw new Error(`Invalid path ${filePath}.`);
        }

        const fileNode = this.getDeepestNode(filePath);
        if (!fileNode) {
            throw new Error(`Path <${filePath}> not found`);
        }
        if (this.nodeIsDirectory(fileNode)) {
            throw new Error(`Path <${filePath}> is a folder`);
        }

        const hashes = fileNode.hashLinks.map(brickObj => brickObj.hashLink);
        return hashes;
    },

    /**
     * @param {string} filePath
     * @return {boolean}
     */
    isEmpty: function (filePath) {
        const node = this.getDeepestNode(filePath);
        if (!node) {
            return true;
        }

        if (this.nodeIsDirectory(node)) {
            return !Object.keys(node.items);
        }
        return !node.hashLinks.length;
    },

    /**
     * Truncates `filePath`
     * @param {string} filePath
     * @throws {Error}
     */
    emptyList: function (filePath) {
        const node = this.getDeepestNode(filePath);
        if (!node) {
            throw new Error(`Invalid path ${filePath}`);
        }

        this.truncateNode(node);
    },

    /**
     * @param {string} path
     * @return {boolean}
     */
    fileExists: function (path) {
        const node = this.getDeepestNode(path);
        return node && !this.nodeIsDeleted(node);
    },

    /**
     * @param {string} path
     * @return {boolean}
     */
    fileDeleted: function (path) {
        const node = this.getDeepestNode(path);
        return node && this.nodeIsDeleted(node);
    },

    /**
     * @param {string} srcPath
     * @param {string} dstPath
     * @throws {Error}
     */
    copy: function (srcPath, dstPath) {
        const srcNode = this.getDeepestNode(srcPath);
        if (!srcNode) {
            throw new Error(`Invalid path <${srcPath}>`);
        }

        const dstNode = this.createNodesFromPath(dstPath, {
            trailingNodeType: this.nodeIsDirectory(srcNode) ? 'parent' : 'child',
            addCreatedAtTimestamp: true
        });

        if (this.nodeIsDirectory(srcNode)) {
            // Clone hashlinks
            dstNode.items = JSON.parse(JSON.stringify(srcNode.items));
            return;
        }

        dstNode.hashLinks = JSON.parse(JSON.stringify(srcNode.hashLinks));
    },


    /**
     * @return {Brick}
     */
    toBrick: function () {
        const brick = new Brick({templateKeySSI: this.templateKeySSI, brickMap: true});
        brick.setKeySSI(this.templateKeySSI);
        brick.setRawData($$.Buffer.from(JSON.stringify(this.header)));
        return brick;
    },


    /**
     * @param {string} folderBarPath
     * @param {boolean} recursive
     * @return {Array<string>}
     */
    getFileList: function (folderBarPath, recursive) {
        if (typeof recursive === "undefined") {
            recursive = true;
        }
        const node = this.getDeepestNode(folderBarPath);
        if (!node) {
            return [];
        }

        const findFiles = (nodes, currentPath) => {
            let files = [];
            currentPath = currentPath || '';

            for (const itemName in nodes) {
                const item = nodes[itemName];
                const itemPath = pskPath.join(currentPath, itemName);

                if (this.nodeIsDirectory(item) && recursive) {
                    files = files.concat(findFiles(item.items, itemPath));
                    continue;
                }

                if (!this.nodeIsDeleted(item) && !this.nodeIsDirectory(item)) {
                    files.push(itemPath);
                }

            }

            return files;
        }

        const files = findFiles(node.items);
        return files;
    },

    /**
     * @param {string} barPath
     * @param {boolean} recursive
     * @return {Array<string>}
     */
    getFolderList: function (barPath, recursive) {
        const node = this.getDeepestNode(barPath);
        if (!node) {
            return [];
        }

        const findFolders = (nodes, currentPath) => {
            let folders = [];
            currentPath = currentPath || '';

            for (const itemName in nodes) {
                const item = nodes[itemName];
                const itemPath = pskPath.join(currentPath, itemName);

                if (!this.nodeIsDirectory(item) || this.nodeIsDeleted(item)) {
                    continue;
                }

                folders.push(itemPath);

                if (recursive) {
                    folders = folders.concat(findFolders(item.items, itemPath));
                    continue;
                }
            }

            return folders;
        }

        const folders = findFolders(node.items);
        return folders;
    },

    getBrickEncryptionKeySSI: function (brickMeta) {
        if (typeof brickMeta === "undefined") {
            return this.templateKeySSI.getIdentifier();
        }

        return brickMeta.key;
    },

    /**
     * Load BrickMap state
     */
    load: function (callback) {
        /**
         * JSON reviver callback
         * Convert serialized $$.Buffer to $$.Buffer instance
         * @param {string} key
         * @param {string} value
         * @return {*}
         */
        const reviver = (key, value) => {
            if (key !== 'key') {
                return value;
            }

            if (typeof value !== 'object') {
                return value;
            }

            if (Object.keys(value).length !== 2) {
                return value;
            }

            if (value.type !== '$$.Buffer' || !Array.isArray(value.data)) {
                return value;
            }
            return $$.Buffer.from(value.data);
        };

        if (this.header instanceof Brick) {
            this.header.setKeySSI(this.templateKeySSI);
            this.header.setKeySSI(this.templateKeySSI.getIdentifier());
            this.header.getRawData((err, rawData) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get raw data`, err));
                }

                this.header = JSON.parse(rawData.toString(), reviver);
                callback();
            });
        } else {
            if ($$.Buffer.isBuffer(this.header)) {
                this.header = this.header.toString();
            }

            if (typeof this.header === "string") {
                this.header = JSON.parse(this.header, reviver);
            }
            callback();
        }
    },

    /**
     * @param {KeySSI} keySSI
     */
    setKeySSI: function (keySSI) {
        this.templateKeySSI = keySSI;
    },

    /**
     * @return {KeySSI}
     */
    getTemplateKeySSI: function () {
        return this.templateKeySSI;
    },

    /**
     * @return {BrickMap}
     */
    clone: function (callback) {
        const InstanceClass = this.constructor;
        const brickMap = new InstanceClass(JSON.stringify(this.header));
        brickMap.setKeySSI(this.templateKeySSI);
        brickMap.load((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load brickMap`, err));
            }

            callback(undefined, brickMap);
        });
    },

    /**
     * @return {object}
     */
    getState: function () {
        return JSON.parse(JSON.stringify(this.header));
    },

    /**
     * @param {string} path
     * @return {object}
     * @throws {Error}
     */
    getMetadata: function (path) {
        const node = this.getDeepestNode(path);
        if (!node) {
            throw new Error(`Invalid path <${path}`);
        }

        if (typeof node.metadata === 'undefined') {
            throw new Error(`Path dosn't have any metadata associated`);
        }

        return node.metadata
    },

    /**
     * @param {object} metadata
     * @throws {Error}
     */
    setMetadata: function (path, metadata) {
        const node = this.getDeepestNode(path);
        if (!node) {
            throw new Error(`Invalid path <${path}`);
        }
        node.metadata = JSON.parse(JSON.stringify(metadata));
    },

    /**
     * @param {string} path
     * @param {string} key
     * @param {*} value
     * @throws {Error}
     */
    updateMetadata: function (path, key, value) {
        const node = this.getDeepestNode(path);
        if (!node) {
            throw new Error(`Invalid path <${path}`);
        }

        node.metadata[key] = value;
    },

    getHashLink: function (callback) {
        const brick = this.toBrick();
        brick.setKeySSI(this.getBrickEncryptionKeySSI());
        brick.getHashLink(callback);
    },

    stat: function (path) {
        const node = this.getDeepestNode(path);
        if (this.nodeIsDirectory(node)) {
            return {type: "directory"}
        }else{
            return {type: "file"}
        }
    }
}

module.exports = BrickMapMixin;

},{"./Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/BrickMapStrategyMixin.js":[function(require,module,exports){
const BrickMapStrategyMixin = {
    brickMapController: null,
    brickMapState: null,
    anchoringEventListener: null,
    conflictResolutionFunction: null,
    decisionFunction: null,
    signingFunction: null,
    cache: null,
    lastHashLink: null,
    validator: null,
    delay: null,
    anchoringTimeout: null,

    initialize: function (options) {
        if (typeof options.anchoringEventListener === 'function') {
            this.setAnchoringEventListener(options.anchoringEventListener);
        }

        if (typeof options.decisionFn === 'function') {
            this.setDecisionFunction(options.decisionFn);
        }

        if (typeof options.conflictResolutionFn === 'function') {
            this.setConflictResolutionFunction(options.conflictResolutionFn);
        }

        if (typeof options.signingFn === 'function') {
            this.setSigningFunction(options.signingFn);
        }

        if (typeof options.delay !== 'undefined' ) {
            if (!this.anchoringEventListener) {
                throw new Error("An anchoring event listener is required when choosing to delay anchoring");
            }
            this.delay = options.delay;
        }
    },

    /**
     * @param {BrickMapController} controller
     */
    setBrickMapController: function (controller) {
        this.brickMapController = controller;
    },

    /**
     * @param {object} state The BrickMap state
     */
    setBrickMapState: function (state) {
        this.brickMapState = state;
    },

    /**
     * @param {function} callback
     */
    setConflictResolutionFunction: function (fn) {
        this.conflictResolutionFunction = fn;
    },

    /**
     * @return {function}
     */
    getConflictResolutionFunction: function () {
        return this.conflictResolutionFunction;
    },

    /**
     *
     * @param {function} listener
     */
    setAnchoringEventListener: function (listener) {
        this.anchoringEventListener = listener;
    },

    /**
     * @param {function} fn
     */
    setSigningFunction: function (fn) {
        this.signingFunction = fn;
    },

    /**
     * @param {function} fn
     */
    setDecisionFunction: function (fn) {
        this.decisionFunction = fn;
    },

    /**
     * @return {function}
     */
    getDecisionFunction: function () {
        return this.decisionFunction;
    },

    /**
     * @param {object} validator 
     */
    setValidator: function (validator) {
        this.validator = validator;
    },

    /**
     * @param {psk-cache.Cache} cache 
     */
    setCache: function (cache) {
        this.cache = cache;
    },

    /**
     * @param {string} key 
     * @return {boolean}
     */
    hasInCache: function (key) {
        if (!this.cache) {
            return false;
        }

        return this.cache.has(key);
    },

    /**
     * @param {string} key 
     * @return {*}
     */
    getFromCache: function (key) {
        if (!this.cache) {
            return;
        }

        return this.cache.get(key);
    },

    /**
     * @param {string} key 
     * @param {*} value 
     */
    storeInCache: function (key, value) {
        if (!this.cache) {
            return;
        }

        this.cache.set(key, value)
    },

    /**
     *
     * @param {BrickMap} brickMap
     * @param {function} callback
     */
    ifChangesShouldBeAnchored: function (brickMap, callback) {
        if (typeof this.decisionFunction === 'function') {
            return this.decisionFunction(brickMap, callback);
        }

        if (this.delay !== null) {
            clearTimeout(this.anchoringTimeout);
            this.anchoringTimeout = setTimeout(() => {
                const anchoringEventListener = this.getAnchoringEventListener(function(){console.log("Anchoring...")});
                this.brickMapController.anchorChanges(anchoringEventListener);
            }, this.delay);
            return callback(undefined, false);
        }
        return callback(undefined, true);
    },

    /**
     * @return {string|null}
     */
    getLastHashLink: function () {
        return this.lastHashLink;
    },

    afterBrickMapAnchoring: function (diff, diffHash, callback) {
        throw new Error('Unimplemented');
    },

    load: function (alias, callback) {
        throw new Error('Unimplemented');
    },

    /**
     * Merge diffs into a single BrickMap object
     * Handles the case when the list of diffs contains
     * whole BrickMap objects
     *
     * @param {BrickMap} brickMap
     * @param {Array<BrickMapDiff>} diffs
     * @return {BrickMap}
     */
    mergeDiffs: function (brickMap, diffs) {
        if (!brickMap && (!Array.isArray(diffs) || !diffs.length)) {
            throw new Error('A target and a list of diffs is required');
        }

        const mergedDiffs = [];

        while (diffs.length) {
            const brickMapDiff = diffs.shift();
            mergedDiffs.push(brickMapDiff);
            brickMap.applyDiff(brickMapDiff);
        }

        return [brickMap, mergedDiffs];
    },

    /* Detect any merge conflicts
     * @param {BrickMap} theirBrickMap The latest anchored BrickMap
     * @param {BrickMap} ourBrickMap Our anchored brickmap
     * @param {KeySSI} ourHashLinkSSI
     */
    detectMergeConflicts: function (theirBrickMap, ourBrickMap, ourHashLinkSSI) {
        // Detect the upstream changeset
        /* @var {BrickMap} */
        const theirChanges = ourBrickMap.diff(theirBrickMap);

        // Check if any of our changes conflict with upstream changeset
        const filesInConflict = theirChanges.detectMergeConflicts(this.brickMapState.getDiffsForAnchoring());

        let conflicts;

        // Call the conflict resolution function if it is defined, or return with error
        if (filesInConflict) {
            conflicts = {
                files: filesInConflict,
                ourHashLinkSSI: ourHashLinkSSI.getIdentifier(),
                theirHashLinkSSI: this.brickMapState.getLastAnchoredHashLink().getIdentifier()
            };
        }
        return conflicts;
    },

    /**
     * Detect merge conflicts and if any, call the conflict resolution function
     * or call the callback with an error
     * @param {BrickMap} theirBrickMap The latest anchored BrickMap
     * @param {BrickMap} ourBrickMap Our anchored brickmap
     * @param {KeySSI} ourHashLinkSSI
     * @param {function} callback
     * @return {boolean} True if merge conflicts were detected, False otherwise
     */
    mergeConflictsHandled: function (theirBrickMap, ourBrickMap, ourHashLinkSSI, callback) {
        const mergeConflicts = this.detectMergeConflicts(theirBrickMap, ourBrickMap, ourHashLinkSSI);

        if (!mergeConflicts) {
            return false;
        }

        // Call the conflict resolution function if it is defined, or return with error
        if (typeof this.conflictResolutionFunction === 'function') {
            this.conflictResolutionFunction(mergeConflicts, (err) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, {
                    status: false
                });
            });
            return true;
        }

        const conflictError = new Error('Anchoring conflict error');
        conflictError.conflicts = mergeConflicts;
        callback(conflictError);
        return true;
    },

    /**
     * Merge remote changes. This method is used when subscring to remote changes
     * on this DSU
     * @param {BrickMap} theirBrickMap The latest anchored BrickMap
     * @param {KeySSI} ourHashLinkSSI
     * @param {function} callback
     */
    merge: function (theirBrickMap, ourHashLinkSSI, callback) {
        const state = this.brickMapState;

        const ourAnchoredBrickMap = state.getAnchoredBrickMap();
        state.prepareNewChangesForAnchoring((err) => {
            if (err) {
                return callback(err);
            }

            if (this.mergeConflictsHandled(theirBrickMap, ourAnchoredBrickMap, ourHashLinkSSI, callback)) {
                return;
            }

            theirBrickMap.clone((err, brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to clone BrickMap`, err));
                }
                const dirtyBrickMap = theirBrickMap;

                // No conflicts detected, merge changes
                try {
                    const diffsForAnchoring = [...state.getDiffsForAnchoring()];
                    if (diffsForAnchoring.length) {
                        this.mergeDiffs(dirtyBrickMap, diffsForAnchoring);
                    }
                } catch (e) {
                    return callback(e);
                }

                state.setDirtyBrickMap(dirtyBrickMap);
                state.setAnchoredBrickMap(brickMap);
                state.setLastAnchoredHashLink(this.getLastHashLink());
                return callback(undefined, {
                    status: true
                });
            })
        });
    },


    /**
     * @param {function} defaultListener
     * @return {function}
     */
    getAnchoringEventListener: function (defaultListener) {
        let anchoringEventListener = this.anchoringEventListener;
        if (typeof anchoringEventListener !== 'function') {
            anchoringEventListener = defaultListener;
        }

        return anchoringEventListener;
    }
}

module.exports = BrickMapStrategyMixin;

},{}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/DiffStrategy.js":[function(require,module,exports){
'use strict';

const BrickMapDiff = require('../../lib/BrickMapDiff');
const BrickMap = require('../BrickMap');
const BrickMapStrategyMixin = require('./BrickMapStrategyMixin');
/**
 * @param {object} options
 * @param {callback} options.decisionFn Callback which will decide when to effectively anchor changes
 *                                                              If empty, the changes will be anchored after each operation
 * @param {callback} options.conflictResolutionFn Callback which will handle anchoring conflicts
 *                                                              The default strategy is to reload the BrickMap and then apply the new changes
 * @param {callback} options.anchoringCb A callback which is called when the strategy anchors the changes
 * @param {callback} options.signingFn  A function which will sign the new alias
 * @param {callback} callback
 */
function DiffStrategy(options) {
    options = options || {};
    Object.assign(this, BrickMapStrategyMixin);
    const openDSU = require("opendsu")
    const anchoring = openDSU.loadAPI("anchoring");
    const bricking = openDSU.loadAPI("bricking");
    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////


    /**
     *
     * @param {Array<BrickMapDiff>} brickMapDiffs
     * @param {callback} callback
     */
    const createBrickMapFromDiffs = (brickMapDiffs, callback) => {
        this.brickMapController.createBrickMap((err, brickMap) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create a new BrickMap`, err));
            }

            try {
                for (const brickMapDiff of brickMapDiffs) {
                    brickMap.applyDiff(brickMapDiff);
                }
            } catch (e) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to apply diffs on brickMap`, e));
            }

            callback(undefined, brickMap);

        });
    }

    /**
     * @param {Array<string>} hashLinks
     * @return {string}
     */
    const createBricksCacheKey = (hashLinks) => {
        return hashLinks.map(hashLink => {
            return hashLink.getIdentifier();
        }).join(':');
    };

    /**
     * @param {Array<Brick>} bricks
     * @return {Array<BrickMapDiff}
     */
    const createDiffsFromBricks = (bricks, callback) => {
        const diffs = [];
        const __createDiffsRecursively = (_bricks) => {
            if (_bricks.length === 0) {
                return callback(undefined, diffs);
            }

            const brick = _bricks.shift();
            this.brickMapController.createBrickMapDiff(brick, (err, brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create diffs from bricks`, err));
                }

                diffs.push(brickMap);
                __createDiffsRecursively(_bricks);
            });
        };

        __createDiffsRecursively(bricks);
    }

    /**
     * Get the list of BrickMapDiffs either from cache
     * or from Brick storage
     *
     * @param {Array<string>} hashLinks
     * @param {callback} callback
     */
    const getBrickMapDiffs = (hashLinks, callback) => {
        const cacheKey = createBricksCacheKey(hashLinks);
        if (this.hasInCache(cacheKey)) {
            const brickMapDiffs = this.getFromCache(cacheKey);
            return callback(undefined, brickMapDiffs);
        }

        const TaskCounter = require("swarmutils").TaskCounter;
        const bricks = [];
        const taskCounter = new TaskCounter(() => {
            createDiffsFromBricks(bricks, (err, brickMapDiffs) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create diffs from bricks`, err));
                }

                this.storeInCache(cacheKey, brickMapDiffs);
                callback(undefined, brickMapDiffs);
            });
        });
        taskCounter.increment(hashLinks.length);
        bricking.getMultipleBricks(hashLinks, (err, brickData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve multiple bricks`, err));
            }

            bricks.push(createBrick(brickData));
            taskCounter.decrement();
        });
    }

    const createBrick = (brickData) => {
        const Brick = require("../../lib/Brick");
        const brick = new Brick();
        brick.setTransformedData(brickData);
        return brick;
    };
    /**
     * Assemble a final BrickMap from several BrickMapDiffs
     * after validating the history
     *
     * @param {Array<string>} hashLinks
     * @param {callback} callback
     */
    const assembleBrickMap = (hashLinks, callback) => {
        this.lastHashLink = hashLinks[hashLinks.length - 1];
        getBrickMapDiffs(hashLinks, (err, brickMapDiffs) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve brickMap diffs`, err));
            }

            this.validator.validate('brickMapHistory', brickMapDiffs, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate brickMapDiffs`, err));
                }

                createBrickMapFromDiffs(brickMapDiffs, callback);
            });
        })
    }


    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    this.load = (keySSI, callback) => {
        anchoring.getAllVersions(keySSI, (err, hashLinks) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve versions for anchor ${keySSI.getAnchorId()}`, err));
            }

            if (!hashLinks.length) {
                return callback(new Error(`No data found for alias <${keySSI.getAnchorId()}>`));
            }

            assembleBrickMap(hashLinks, callback);
        })
    }


    /**
     * Compact a list of BrickMapDiff objects
     * into a single BrickMap object
     *
     * @param {BrickMap|undefined} dstBrickMap
     * @return {BrickMapDiff}
     */
    this.compactDiffs = (dstBrickMap, callback) => {
        if (typeof dstBrickMap === 'function') {
            callback = dstBrickMap;
            dstBrickMap = undefined;
        }
        this.brickMapState.prepareNewChangesForAnchoring((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to prepare diffs for anchoring`, err));
            }

            const mergedDiffs = (dstBrickMap, callback) => {
                const diffsForAnchoring = this.brickMapState.getDiffsForAnchoring();
                let result;
                let error;
                try {
                    result = this.mergeDiffs(dstBrickMap, diffsForAnchoring);
                } catch (e) {
                    error = e;
                }
                callback(error, result);
            }

            if (!dstBrickMap) {
                return this.brickMapController.createBrickMapDiff((err, dstBrickMap) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create empty BrickMapDiff`, err));
                    }

                    mergedDiffs(dstBrickMap, callback);
                })

            }

            mergedDiffs(dstBrickMap, callback);
        })
    }

    /**
     * Merge the `diff` object into the current valid
     * BrickMap object
     *
     * @param {BrickMapDiff} diff
     * @param {string} diffHash
     * @param {callback} callback
     */
    this.afterBrickMapAnchoring = (diff, diffHash, callback) => {
        const anchoredBrickMap = this.brickMapState.getAnchoredBrickMap();
        try {
            anchoredBrickMap.applyDiff(diff);
        } catch (e) {
            return callback(e);
        }
        this.lastHashLink = diffHash;
        this.lastAnchorTimestamp = new Date().getTime();
        this.brickMapState.setLastAnchoredHashLink(diffHash);
        callback(undefined, diffHash);
    }


    /**
     * Try and fix an anchoring conflict
     *
     * Merge any "pending anchoring" BrickMapDiff objects in a clone
     * of our anchored BrickMap. If merging fails, call the 'conflictResolutionFn'
     * in order to fix the conflict. If merging succeeds, update the "dirtyBrickMap"
     *
     * If no 'conflictResolutionFn' function was defined
     * The callback will be called with the following error:
     *
     *  error: Error {
     *      message: 'Anchoring conflict error',
     *      conflicts: {
     *          files: {
     *              '/file/path/in/conflict': {
     *                  error: 'LOCAL_OVERWRITE|REMOTE_DELETE|LOCAL_DELETE', // type of conflict
     *                  message: '[User friendly error message]'
     *              },
     *              ...
     *          },
     *          theirHashLinkSSI: '...', // HashLinkSSI of the latest anchored BrickMap
     *          ourHashLinkSSI: '...' // The HashLinkSSI of our version
     *      }
     *  }
     *
     *  Where conflicts.*.error:
     *      LOCAL_OVERWRITE - Our changes will overwrite a newly anchored file/directory
     *      REMOTE_DELETE - The file path we're trying to anchor has been deleted
     *      LOCAL_DELETE - Our changes will delete a newly anchored file/directory
     *
     * If a 'conflictResolutionFn' is defined it will be called with the following arguments:
     *  conflicts - The conflicts object described above
     *  callback
     *
     * @param {BrickMap} theirBrickMap The latest anchored BrickMap
     * @param {KeySSI} ourHashLinkSSI
     * @param {function} callback
     */
    this.reconcile = (theirBrickMap, ourHashLinkSSI, callback) => {
        const state = this.brickMapState;

        const ourAnchoredBrickMap = state.getAnchoredBrickMap();
        state.prepareNewChangesForAnchoring((err) => {
            if (err) {
                return callback(err);
            }

            if (this.mergeConflictsHandled(theirBrickMap, ourAnchoredBrickMap, ourHashLinkSSI, callback)) {
                return;
            }

            // We only need to update the dirty brick map
            // The BrickMapController will compact our diffs and try to anchor them again
            try {
                this.mergeDiffs(theirBrickMap, [...state.getDiffsForAnchoring()]);
                state.setDirtyBrickMap(theirBrickMap);
            } catch (e) {
                return callback(e);
            }
            callback(undefined, {
                status: true
            });
        });
    }

    this.initialize(options);
}

module.exports = DiffStrategy;

},{"../../lib/Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","../../lib/BrickMapDiff":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapDiff.js","../BrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js","./BrickMapStrategyMixin":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/BrickMapStrategyMixin.js","opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/LatestVersionStrategy.js":[function(require,module,exports){
'use strict';

const BrickMapDiff = require('../BrickMapDiff');
const BrickMap = require('../BrickMap');
const BrickMapStrategyMixin = require('./BrickMapStrategyMixin');
const Brick = require("../../lib/Brick");

/**
 * @param {object} options
 * @param {function} options.decisionFn Callback which will decide when to effectively anchor changes
 *                                                              If empty, the changes will be anchored after each operation
 * @param {function} options.anchoringCb A callback which is called when the strategy anchors the changes
 * @param {function} options.signingFn  A function which will sign the new alias
 * @param {function} callback
 */
function LatestVersionStrategy(options) {
    options = options || {};
    Object.assign(this, BrickMapStrategyMixin);
    const openDSU = require("opendsu");
    const anchoring = openDSU.loadAPI("anchoring");
    const bricking = openDSU.loadAPI("bricking");
    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {Array<string>} hashes
     * @return {string}
     */
    const createBricksCacheKey = (hashes) => {
        return hashes.map(hash => {
            return hash.getIdentifier();
        }).join(':');
    };

    /**
     * @param {Array<Brick>} bricks
     * @return {Array<BrickMapDiff}
     */
    const createMapsFromBricks = (bricks, callback) => {
        const brickMaps = [];
        const __createBrickMapsRecursively = (_bricks) => {
            if (_bricks.length === 0) {
                return callback(undefined, brickMaps);
            }

            const brick = _bricks.shift();
            this.brickMapController.createBrickMap(brick, (err, brickMap) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create a new BrickMap`, err));
                }

                brickMaps.push(brickMap);
                __createBrickMapsRecursively(_bricks);
            });
        };

        __createBrickMapsRecursively(bricks);
    }

    /**
     * Get a list of BrickMap objects either from cache
     * or from Brick storage
     *
     * @param {Array<string>} hashes
     * @param {function} callback
     */
    const createBrickMapsFromHistory = (hashes, callback) => {
        const cacheKey = createBricksCacheKey(hashes);
        if (this.hasInCache(cacheKey)) {
            const brickMaps = this.getFromCache(cacheKey);
            return callback(undefined, brickMaps);
        }

        const TaskCounter = require("swarmutils").TaskCounter;
        const bricks = [];
        const taskCounter = new TaskCounter(() => {
            createMapsFromBricks(bricks, (err, brickMaps) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create maps from bricks`, err));
                }

                this.storeInCache(cacheKey, brickMaps);
                callback(undefined, brickMaps);
            });
        });
        taskCounter.increment(hashes.length);
        bricking.getMultipleBricks(hashes, (err, brickData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve multiple bricks`, err));
            }

            bricks.push(createBrick(brickData));
            taskCounter.decrement();
        });
    }

    const createBrick = (brickData) => {
        const brick = new Brick();
        brick.setTransformedData(brickData);
        return brick;
    };

    /**
     * Get the latest BrickMap version after validating the
     * history
     *
     * @param {Array<string>} hashes
     * @param {function} callback
     */
    const getLatestVersion = (hashes, callback) => {
        this.lastHashLink = hashes[hashes.length - 1];

        createBrickMapsFromHistory([this.lastHashLink], (err, brickMaps) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create BrickMaps from history`, err));
            }

            this.validator.validate('brickMapHistory', brickMaps, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to validate BrickMaps`, err));
                }

                const latestBrickMap = brickMaps[brickMaps.length - 1];
                callback(undefined, latestBrickMap);
            });
        })
    }


    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    this.load = (keySSI, callback) => {
        anchoring.getAllVersions(keySSI, (err, versionHashes) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get versions for anchor ${keySSI.getAnchorId()}`, err));
            }
            if (!versionHashes.length) {
                return callback(new Error(`No data found for alias <${keySSI.getAnchorId()}>`));
            }

            getLatestVersion(versionHashes, callback);
        })
    }


    /**
     * Compact a list of BrickMapDiff objects
     * into a single BrickMap object
     *
     * @param {BrickMap|undefined} dstBrickMap
     * @return {BrickMapDiff}
     */
    this.compactDiffs = (dstBrickMap, callback) => {
        if (typeof dstBrickMap === 'function') {
            callback = dstBrickMap;
            dstBrickMap = undefined;
        }
        this.brickMapState.prepareNewChangesForAnchoring((err) => {
            if (err) {
                return callback(err);
            }

            const mergeDiffs = (err, dst) => {
                if (err) {
                    return callback(err);
                }

                let result;
                try {
                    result = this.mergeDiffs(dst, this.brickMapState.getDiffsForAnchoring());
                } catch (e) {
                    return callback(e);
                }
                callback(undefined, result);
            }

            if (!dstBrickMap) {
                return this.brickMapState.cloneAnchoredBrickMap(mergeDiffs);
            }

            mergeDiffs(undefined, dstBrickMap);
        })
    }

    /**
     * Tell the BrickMapController to use the newly anchored
     * BrickMap as a valid one
     *
     * @param {BrickMap} diff
     * @param {string} brickMapHashLink
     * @param {function} callback
     */
    this.afterBrickMapAnchoring = (brickMap, brickMapHashLink, callback) => {
        this.lastHashLink = brickMapHashLink;
        this.lastAnchorTimestamp = new Date().getTime();
        this.brickMapState.setAnchoredBrickMap(brickMap);
        this.brickMapState.setLastAnchoredHashLink(brickMapHashLink);
        callback(undefined, brickMapHashLink);
    }

    /**
     * Try and fix an anchoring conflict
     *
     * Merge any "pending anchoring" BrickMapDiff objects in a clone
     * of our anchored BrickMap. If merging fails, call the 'conflictResolutionFn'
     * in order to fix the conflict. If merging succeeds, update the "dirtyBrickMap"
     *
     * If no 'conflictResolutionFn' function was defined
     * The callback will be called with the following error:
     *
     *  error: Error {
     *      message: 'Anchoring conflict error',
     *      conflicts: {
     *          files: {
     *              '/file/path/in/conflict': {
     *                  error: 'LOCAL_OVERWRITE|REMOTE_DELETE|LOCAL_DELETE', // type of conflict
     *                  message: '[User friendly error message]'
     *              },
     *              ...
     *          },
     *          theirHashLinkSSI: '...', // HashLinkSSI of the latest anchored BrickMap
     *          ourHashLinkSSI: '...' // The HashLinkSSI of our version
     *      }
     *  }
     *
     *  Where conflicts.*.error:
     *      LOCAL_OVERWRITE - Our changes will overwrite a newly anchored file/directory
     *      REMOTE_DELETE - The file path we're trying to anchor has been deleted
     *      LOCAL_DELETE - Our changes will delete a newly anchored file/directory
     *
     * If a 'conflictResolutionFn' is defined it will be called with the following arguments:
     *  conflicts - The conflicts object described above
     *  callback
     *
     * @param {BrickMap} theirBrickMap The latest anchored BrickMap
     * @param {KeySSI} ourHashLinkSSI
     * @param {function} callback
     */
    this.reconcile = (theirBrickMap, ourHashLinkSSI, callback) => {
        const state = this.brickMapState;

        state.cloneAnchoredBrickMap((err, ourAnchoredBrickMap) => {
            if (err) {
                return callback(err);
            }

            state.prepareNewChangesForAnchoring((err) => {
                if (err) {
                    return callback(err);
                }

                if (this.mergeConflictsHandled(theirBrickMap, ourAnchoredBrickMap, ourHashLinkSSI, callback)) {
                    return;
                }

                // No conflicts detected, merge changes
                let ourChanges;
                let mergedDiffs;
                try {
                    const diffsForAnchoring = state.getDiffsForAnchoring();

                    if (diffsForAnchoring.length) {
                        [ourChanges, mergedDiffs] = this.mergeDiffs(ourAnchoredBrickMap, diffsForAnchoring);
                        theirBrickMap.merge(ourChanges);
                    }

                    // Their BrickMap now has our changes
                    // and becomes ours
                    state.setDirtyBrickMap(theirBrickMap);
                } catch (e) {
                    state.rollback(mergedDiffs)
                    return callback(e);
                }
                return callback(undefined, {
                    status: true,
                    brickMap: theirBrickMap
                });
            });
        })
    };


    this.initialize(options);
}

module.exports = LatestVersionStrategy;

},{"../../lib/Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","../BrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js","../BrickMapDiff":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapDiff.js","./BrickMapStrategyMixin":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/BrickMapStrategyMixin.js","opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/builtinBrickMapStrategies.js":[function(require,module,exports){
module.exports = {
    DIFF: 'Diff',
    LATEST_VERSION: 'LatestVersion',
    DEFAULT_BRICK_MAP_STRATEGY: 'LatestVersion'
    //DEFAULT_BRICK_MAP_STRATEGY: 'Diff'
}

},{}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/index.js":[function(require,module,exports){
/**
 * @param {object} options
 */
function BrickMapStrategyFactory(options) {
    const DiffStrategy = require('./DiffStrategy');
    const LastestVersionStrategy = require('./LatestVersionStrategy');
    const builtInStrategies = require("./builtinBrickMapStrategies");
    options = options || {};

    const factories = {};

    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////

    const initialize = () => {
        const builtinStrategies = require("./builtinBrickMapStrategies");
        this.registerStrategy(builtinStrategies.DIFF, this.createDiffStrategy);
        this.registerStrategy(builtinStrategies.LATEST_VERSION, this.createLatestVersionStrategy);
    }

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {string} strategyName
     * @param {object} factory
     */
    this.registerStrategy = (strategyName, factory) => {
        factories[strategyName] = factory;
    }

    /**
     * @param {string} strategyName
     * @param {object} options
     * @return {BrickMapStrategyMixin}
     */
    this.create = (strategyName, options) => {
        if (typeof strategyName === "undefined") {
            strategyName = builtInStrategies.DEFAULT_BRICK_MAP_STRATEGY;
        }
        const factory = factories[strategyName];
        options = options || {};
        return factory(options);
    }

    /**
     * @param {object} options
     * @return {DiffStrategy}
     */
    this.createDiffStrategy = (options) => {
        return new DiffStrategy(options);
    }

    /**
     * @param {object} options
     * @return {LastestVersionStrategy}
     */
    this.createLatestVersionStrategy = (options) => {
        return new LastestVersionStrategy(options);
    }

    initialize();
}

module.exports = BrickMapStrategyFactory;

},{"./DiffStrategy":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/DiffStrategy.js","./LatestVersionStrategy":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/LatestVersionStrategy.js","./builtinBrickMapStrategies":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/builtinBrickMapStrategies.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickStorageService/Service.js":[function(require,module,exports){
'use strict';


/**
 * Brick storage layer
 * Wrapper over EDFSBrickStorage
 *
 * @param {object} options
 * @param {Cache} options.cache
 * @param {number} options.bufferSize
 * @param {EDFSBrickStorage} options.storageProvider
 * @param {callback} options.brickFactoryFunction
 * @param {FSAdapter} options.fsAdapter
 * @param {callback} options.brickDataExtractorCallback
 */
function Service(options) {
    const envTypes = require("overwrite-require").constants;
    const isStream = require("../../utils/isStream");
    const stream = require('stream');
    const utils = require("swarmutils");
    const crypto = require("opendsu").loadAPI("crypto");
    const HASHLINK_EMBEDDED_HINT_PREFIX = 'embedded/';

    options = options || {};
    this.cache = options.cache;
    this.bufferSize = parseInt(options.bufferSize, 10);
    this.brickFactoryFunction = options.brickFactoryFunction;
    this.fsAdapter = options.fsAdapter;
    this.brickDataExtractorCallback = options.brickDataExtractorCallback;
    this.keySSI = options.keySSI;

    const openDSU = require("opendsu");
    const SSIKeys = openDSU.loadApi("keyssi");
    const bricking = openDSU.loadApi("bricking");
    const anchoring = openDSU.loadApi("anchoring");

    if (isNaN(this.bufferSize) || this.bufferSize < 1) {
        throw new Error('$$.Buffer size is required');
    }

    if (typeof this.brickFactoryFunction !== 'function') {
        throw new Error('A brick factory function is required');
    }

    if (!this.fsAdapter && $$.environmentType !== envTypes.BROWSER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.SERVICE_WORKER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.WEB_WORKER_ENVIRONMENT_TYPE) {
        throw new Error('A file system adapter is required');
    }

    if (typeof this.brickDataExtractorCallback !== 'function') {
        throw new Error('A Brick data extractor callback is required');
    }

    /**
     * @param {HashLinkSSI} hlSSI
     * @return {HashLinkSSI}
     */
    const stripHintFromHashLinkSSI = (hlSSI) => {
        //TODO: remove the stripHintFromHashLinkSSI and use direct
        return hlSSI.getNoHintIdentifier();
    };

    /**
     * @param {*} key
     * @return {Boolean}
     */
    const hasInCache = (key) => {
        if (!this.cache) {
            return false;
        }

        return this.cache.has(key);
    };

    /**
     * @param {*} key
     * @param {*} value
     */
    const storeInCache = (key, value) => {
        if (!this.cache) {
            return;
        }

        this.cache.set(key, value);
    };

    /**
     * Creates writable stream to a EDFSBrickStorage instance
     *
     * @param {EDFSBrickStorage} storageProvider
     * @param {callback} beforeCopyCallback
     * @return {stream.Writable}
     */
    const createBricksWritableStream = (storageProvider, beforeCopyCallback) => {
        const self = this;
        return ((storageProvider, beforeCopyCallback) => {

            const writableStream = new stream.Writable({
                write(brickContainer, encoding, callback) {
                    let {brick, brickMeta} = brickContainer;
                    if (typeof beforeCopyCallback === 'function') {
                        brick = beforeCopyCallback(brickMeta, brick);
                    }

                    brick.getTransformedData((err, brickData) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
                        }

                        bricking.putBrick(self.keySSI.getBricksDomain(), brickData, (err, digest) => {
                            if (err) {
                                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick`, err));
                            }

                            brick.getSummary((err, brickSummary) => {
                                if (err) {
                                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get bricks summary`, err));
                                }


                                brickSummary.digest = digest;
                                this.bricksSummary.push(brickSummary);

                                callback();
                            });
                        })
                    });
                },
                objectMode: true
            });

            writableStream.bricksSummary = [];
            return writableStream;

        })(storageProvider, beforeCopyCallback);
    };

    /**
     * Create a readable stream of Brick objects
     * retrieved from EDFSBrickStorage
     *
     * @param {Array<object>} bricksMeta
     * @return {stream.Readable}
     */
    const createBricksReadableStream = (bricksMeta) => {
        return ((bricksMeta) => {

            let brickIndex = 0;

            const readableStream = new stream.Readable({
                read(size) {
                    if (!bricksMeta.length) {
                        return self.push(null);
                    }
                    if (brickIndex < bricksMeta.length) {
                        self.getBrick(brickIndex++);
                    }
                },
                objectMode: true
            });

            // Get a brick and push it into the stream
            const self = this;
            readableStream.getBrick = function (brickIndex) {
                const brickMeta = bricksMeta[brickIndex];
                const hlSSI = SSIKeys.parse(brickMeta.hashLink);
                bricking.getBrick(hlSSI, (err, brick) => {
                    if (err) {
                        this.destroy(err);
                        return;
                    }

                    this.push({
                        brickMeta,
                        brick
                    });

                    if (brickIndex >= (bricksMeta.length - 1)) {
                        this.push(null);
                    }
                });
            };

            return readableStream;

        })(bricksMeta);
    };

    const createBrick = (brickData) => {
        const Brick = require("../Brick");
        const brick = new Brick();
        brick.setTransformedData(brickData);
        return brick;
    };

    /**
     * @param {HashLinkSSI} hlSSI
     * @return {boolean}
     */
    const hashLinkHasEmbeddedHint = (hlSSI) => {
        const hlSSIHint = hlSSI.getHint();
        return (hlSSIHint && hlSSIHint.indexOf(HASHLINK_EMBEDDED_HINT_PREFIX) === 0)
    }

    /**
     * Extract an embedded Brick from an unencrypted Brick container
     * @param {HashLinkSSI} hlSSI
     * @param {object} brickMeta
     * @param {callback} callback
     */
    const getEmbeddedBrickAsBuffer = (hlSSI, brickMeta, callback) => {
        const hlSSIHint = hlSSI.getHint();
        const hintSegments = hlSSIHint.split('/').pop();
        let [offset, size, embeddedHlSSI] = hintSegments.split(',');

        offset = parseInt(offset, 10);
        size = parseInt(size, 10);

        if (isNaN(offset) || isNaN(size) || !embeddedHlSSI) {
            return callback(new Error(`Embedded hint is invalid. Expected offset,size,hlSSI and got: ${hintSegments}`));
        }

        const cacheKey = embeddedHlSSI;

        if (hasInCache(cacheKey)) {
            const data = this.cache.get(cacheKey);
            return callback(undefined, data);
        }

        const containerBrickMeta = Object.assign({}, brickMeta);
        // The container Brick is not encrypted
        delete containerBrickMeta.key;
        // The container Brick doesn't need the hint
        containerBrickMeta.hashLink = stripHintFromHashLinkSSI(hlSSI);

        // Get the container Brick data
        getBrickAsBuffer(containerBrickMeta, (err, data) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get bricks as buffer`, err));
            }

            const brickData = data.slice(offset, offset + size);
            return this.brickDataExtractorCallback(brickMeta, createBrick(brickData), (err, data) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to process brick data`, err));
                }

                storeInCache(cacheKey, data);
                return callback(undefined, data);
            });
        });
    }

    /**
     * Retrieves a Brick from storage and converts
     * it into a $$.Buffer
     *
     * @param {object} brickMeta
     * @param {callback} callback
     */
    const getBrickAsBuffer = (brickMeta, callback) => {
        const hlSSI = SSIKeys.parse(brickMeta.hashLink);

        if (hashLinkHasEmbeddedHint(hlSSI)) {
            return getEmbeddedBrickAsBuffer(hlSSI, brickMeta, callback);
        }

        let cacheKey = brickMeta.hashLink;
        if (hasInCache(cacheKey)) {
            const data = this.cache.get(cacheKey);
            return callback(undefined, data);
        }

        bricking.getBrick(hlSSI, (err, brickData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick data`, err));
            }

            function checkBrickDataIntegrity(brickData, callback) {
                brickData = utils.ensureIsBuffer(brickData);
                const hashFn = crypto.getCryptoFunctionForKeySSI(hlSSI, "hash");
                const _brickHash = hashFn(brickData);
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to compute brick hash`, err));
                }

                const brickHash = hlSSI.getHash();

                if (brickHash !== _brickHash) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Got invalid data for brick ${brickHash}`, Error("Possible brick data corruption")));
                }

                callback();
            }

            checkBrickDataIntegrity(brickData, (err) => {
                if (err) {
                    return callback(err);
                }

                this.brickDataExtractorCallback(brickMeta, createBrick(brickData), (err, data) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to process brick data`, err));
                    }

                    if (!$$.Buffer.isBuffer(data) && (data instanceof ArrayBuffer || ArrayBuffer.isView(data))) {
                        data = utils.ensureIsBuffer(data);
                    }
                    storeInCache(cacheKey, data);
                    return callback(undefined, data);
                });
            });
        });
    };

    /**
     * Counts the number of blocks in a file
     *
     * @param {string} filePath
     * @param {callback} callback
     */
    const getFileBlocksCount = (filePath, callback) => {
        this.fsAdapter.getFileSize(filePath, (err, size) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get size for file <${filePath}>`, err));
            }

            let blocksCount = Math.floor(size / this.bufferSize);
            if (size % this.bufferSize > 0) {
                ++blocksCount;
            }

            callback(undefined, blocksCount);
        })
    };

    /**
     * Creates a Brick from a $$.Buffer
     * and saves it into brick storage
     *
     * @param {$$.Buffer} data
     * @param {boolean|callback} encrypt Defaults to `true`
     * @param {callback|undefined} callback
     */
    const convertDataBlockToBrick = (data, encrypt, callback) => {
        if (typeof encrypt === 'function') {
            callback = encrypt;
            encrypt = true;
        }
        const brick = this.brickFactoryFunction(encrypt);
        brick.setRawData(data);
        brick.getTransformedData((err, brickData) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
            }

            bricking.putBrick(this.keySSI.getBricksDomain(), brickData, (err, digest) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick`, err));
                }

                brick.getSummary((err, brickSummary) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get bricks summary`, err));
                    }


                    brickSummary.digest = digest;
                    callback(undefined, brickSummary);
                });
            });
        });
    };

    /**
     * Recursively breaks a buffer into Brick objects and
     * stores them into storage
     *
     * @param {Array<object>} resultContainer
     * @param {$$.Buffer} buffer
     * @param {number} blockIndex
     * @param {object} options
     * @param {number} options.bufferSize
     * @param {callback} callback
     */
    const convertBufferToBricks = (resultContainer, buffer, blockIndex, options, callback) => {
        const bufferSize = options.bufferSize;
        let blocksCount = Math.floor(buffer.length / bufferSize);
        if ((buffer.length % bufferSize) > 0) {
            ++blocksCount;
        }

        const encrypt = (typeof options.encrypt === 'undefined') ? true : options.encrypt;
        const blockData = buffer.slice(blockIndex * bufferSize, (blockIndex + 1) * bufferSize);

        convertDataBlockToBrick(blockData, encrypt, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to convert data block to brick`, err));
            }

            resultContainer.push(result);
            ++blockIndex;

            if (blockIndex < blocksCount) {
                return convertBufferToBricks(resultContainer, buffer, blockIndex, options, callback);
            }

            return callback();
        });
    };

    /**
     * Copy the contents of a file into brick storage
     *
     * @param {Array<object>} resultContainer
     * @param {string} filePath
     * @param {object} options
     * @param {number} options.blockIndex
     * @param {number} options.blocksCount
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    const convertFileToBricks = (resultContainer, filePath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }

        if (typeof options.blockIndex === 'undefined') {
            options.blockIndex = 0;
        }

        let blockIndex = options.blockIndex;
        const blocksCount = options.blocksCount;
        const blockOffset = blockIndex * this.bufferSize;
        const blockEndOffset = (blockIndex + 1) * this.bufferSize - 1;
        this.fsAdapter.readBlockFromFile(filePath, blockOffset, blockEndOffset, (err, data) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read block from file <${filePath}>`, err));
            }

            convertDataBlockToBrick(data, options.encrypt, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to convert data block to brick`, err));
                }

                resultContainer.push(result);
                ++blockIndex;

                if (blockIndex < blocksCount) {
                    options.blockIndex = blockIndex;
                    return convertFileToBricks(resultContainer, filePath, options, callback);
                }

                return callback();
            })
        })
    };

    /**
     * Save the buffer containing multiple files as a single brick
     * and generate the proper HashLinkSSI for each file in the brick
     *
     * Each file's HashLinkSSI is constructed by appending the `embedded/${offset},${size}` hint
     * at the end of the Brick's HashLinkSSI. Ex:
     * Brick HashLinkSSI:
     *      ssi:hl:default:29LuHPtSrCG7u4nKNPB8KbG2EuK1U84X5pTTTko2GGcpxZGyPFC1jG8hAh6g2DbYKJxYumJFmNyQWu3iNpQe5jHR::v0
     * File in brick HashLinkSSI:
     *      ssi:hl:default:29LuHPtSrCG7u4nKNPB8KbG2EuK1U84X5pTTTko2GGcpxZGyPFC1jG8hAh6g2DbYKJxYumJFmNyQWu3iNpQe5jHR::v0:embedded/0,5
     *
     * @param {$$.Buffer} buffer
     * @param {Array<Object>} filesList
     * @param {string} filesList[].filename
     * @param {Number} filesList[].offset
     * @param {Number} filesList[].size
     * @param {callback} callback
     */
    const storeCompactedFiles = (buffer, filesList, callback) => {
        return convertDataBlockToBrick(buffer, false, (err, brickMeta) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to convert data block to brick`, err));
            }
            const files = {};
            const brickHLSSI = SSIKeys.parse(brickMeta.hashLink);

            for (const fileInfo of filesList) {
                const fileHLSSIHint = `${HASHLINK_EMBEDDED_HINT_PREFIX}${fileInfo.offset},${fileInfo.size},${fileInfo.brickSummary.hashLink}`;

                const fileHLSSI = SSIKeys.createHashLinkSSI(
                    brickHLSSI.getDLDomain(),
                    brickHLSSI.getSpecificString(),
                    brickHLSSI.getVn(),
                    fileHLSSIHint
                );
                fileInfo.brickSummary.hashLink = fileHLSSI.getIdentifier();
                files[fileInfo.filename] = [fileInfo.brickSummary];
            }

            return callback(undefined, files);
        });
    }

    /**
     * Stores a $$.Buffer as Bricks into brick storage
     *
     * @param {$$.Buffer} buffer
     * @param {objects|callback} options
     * @param {number|callback} options.bufferSize
     * @param {callback|undefined} callback
     */
    this.ingestBuffer = (buffer, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }

        if (!options.bufferSize) {
            options.bufferSize = this.bufferSize;
        }

        const bricksSummary = [];
        convertBufferToBricks(bricksSummary, buffer, 0, options, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to convert buffer to bricks`, err));
            }

            callback(undefined, bricksSummary);
        });
    };

    /**
     * Reads a stream of data into multiple Brick objects
     * stored in brick storage
     *
     * @param {stream.Readable} stream
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback}
     */
    this.ingestStream = (stream, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            };
        }

        let bricksSummary = [];
        let receivedData = [];
        stream.on('data', (chunk) => {
            if (typeof chunk === 'string') {
                chunk = $$.Buffer.from(chunk);
            }

            receivedData.push(chunk);
            let chunksCount = this.bufferSize / chunk.length;
            if (receivedData.length >= chunksCount) {
                const buffer = $$.Buffer.concat(receivedData.splice(0, chunksCount));
                stream.pause();
                const ingestBufferOptions = {
                    bufferSize: buffer.length,
                    encrypt: options.encrypt
                };
                this.ingestBuffer(buffer, ingestBufferOptions, (err, summary) => {
                    if (err) {
                        stream.destroy(err);
                        return;
                    }
                    bricksSummary = bricksSummary.concat(summary);
                    stream.resume();
                });
            }
        });
        stream.on('error', (err) => {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest stream`, err));
        });
        stream.on('end', () => {
            const buffer = $$.Buffer.concat(receivedData);
            const ingestBufferOptions = {
                bufferSize: buffer.length,
                encrypt: options.encrypt
            };
            this.ingestBuffer(buffer, ingestBufferOptions, (err, summary) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest buffer`, err));
                }

                bricksSummary = bricksSummary.concat(summary);
                callback(undefined, bricksSummary);
            });
        })
    };

    /**
     * @param {string|$$.Buffer|stream.Readable} data
     * @param {callback} callback
     */
    this.ingestData = (data, options, callback) => {
        if (typeof data === 'string') {
            data = $$.Buffer.from(data);
        }

        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true,
            };
        }

        if (!$$.Buffer.isBuffer(data) && !isStream.isReadable(data)) {
            return callback(Error(`Type of data is ${typeof data}. Expected $$.Buffer or Stream.Readable`));
        }

        if ($$.Buffer.isBuffer(data)) {
            return this.ingestBuffer(data, options, callback);
        }

        return this.ingestStream(data, options, callback);
    };

    /**
     * Copy the contents of a file into brick storage
     *
     * @param {string} filePath
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    this.ingestFile = (filePath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }
        const bricksSummary = [];

        getFileBlocksCount(filePath, (err, blocksCount) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed get blocks for file <${filePath}>`, err));
            }

            const conversionOptions = Object.assign({}, options);
            conversionOptions.blocksCount = blocksCount;
            convertFileToBricks(bricksSummary, filePath, conversionOptions, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to convert file <${filePath}> to bricks`, err));
                }

                callback(undefined, bricksSummary);
            });
        });
    };

    /**
     * Copy the contents of multiple files into brick storage
     *
     * @param {Array<string>} filePath
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    this.ingestFiles = (files, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }

        const bricksSummary = {};

        const ingestFilesRecursive = (files, callback) => {
            if (!files.length) {
                return callback(undefined, bricksSummary);
            }

            const filePath = files.pop();
            const filename = require("path").basename(filePath);

            this.ingestFile(filePath, options, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest file <${filePath}>`, err));
                }

                bricksSummary[filename] = result;

                ingestFilesRecursive(files, callback);
            });
        };

        ingestFilesRecursive(files, callback);
    };

    /**
     * Copy the contents of folder into a single brick
     *
     * @param {string} folderPath
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    this.createBrickFromFolder = (folderPath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }
        const filesIterator = this.fsAdapter.getFilesIterator(folderPath);
        const filesList = [];

        const brickBuffers = [];
        let currentOffset = 0;

        const iteratorHandler = (err, filename, dirname) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create brick from folder <${folderPath}>`, err));
            }

            if (typeof filename === 'undefined') {
                const buffer = $$.Buffer.concat(brickBuffers);
                return storeCompactedFiles(buffer, filesList, callback);
            }

            const filePath = require("path").join(dirname, filename);
            this.readFile(filePath, (err, fileBuffer) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read file <${filePath}>`, err));
                }

                const fileBrick = this.brickFactoryFunction(options.encrypt);
                fileBrick.setRawData(fileBuffer);
                fileBrick.getTransformedData((err, brickData) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
                    }

                    fileBrick.getSummary((err, brickSummary) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick summary`, err));
                        }

                        const size = brickData.length;
                        const offset = currentOffset;

                        currentOffset += size;
                        filesList.push({
                            filename,
                            offset,
                            size,
                            brickSummary
                        });
                        brickBuffers.push(brickData);

                        filesIterator.next(iteratorHandler);
                    })
                });
            });
        };

        filesIterator.next(iteratorHandler);

    };

    /**
     * Copy the contents of multiple files into a single brick
     *
     * @param {string} folderPath
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    this.createBrickFromFiles = (files, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            }
        }
        const filesList = [];

        const brickBuffers = [];
        let currentOffset = 0;
        const readFilesRecursive = (files, callback) => {
            if (!files.length) {
                const buffer = $$.Buffer.concat(brickBuffers);
                return storeCompactedFiles(buffer, filesList, callback);
            }

            const filePath = files.pop();
            const filename = require("path").basename(filePath);

            this.readFile(filePath, (err, fileBuffer) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read file <${filePath}>`, err));
                }

                const fileBrick = this.brickFactoryFunction(options.encrypt);
                fileBrick.setRawData(fileBuffer);
                fileBrick.getTransformedData((err, brickData) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get transformed data`, err));
                    }

                    fileBrick.getSummary((err, brickSummary) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest file <${filePath}>`, err));
                        }

                        const size = brickData.length;
                        const offset = currentOffset;

                        currentOffset += size;
                        filesList.push({
                            filename,
                            offset,
                            size,
                            brickSummary
                        });
                        brickBuffers.push(brickData);

                        readFilesRecursive(files, callback);
                    });
                });
            });
        }

        readFilesRecursive(files, callback);
    };

    /**
     * Copy the contents of folder into brick storage
     *
     * @param {string} folderPath
     * @param {object|callback} options
     * @param {boolean} options.encrypt
     * @param {callback} callback
     */
    this.ingestFolder = (folderPath, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {
                encrypt: true
            };
        }
        const bricksSummary = {};
        const filesIterator = this.fsAdapter.getFilesIterator(folderPath);

        const iteratorHandler = (err, filename, dirname) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest folder <${folderPath}>`, err));
            }

            if (typeof filename === 'undefined') {
                return callback(undefined, bricksSummary);
            }

            const filePath = require("path").join(dirname, filename);
            this.ingestFile(filePath, options, (err, result) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to ingest file <${filePath}>`, err));
                }

                bricksSummary[filename] = result;
                filesIterator.next(iteratorHandler);
            });
        };

        filesIterator.next(iteratorHandler);
    };

    /**
     * Retrieve all the Bricks identified by `bricksMeta`
     * from storage and create a $$.Buffer using their data
     *
     * @param {Array<object>} bricksMeta
     * @param {callback} callback
     */
    this.createBufferFromBricks = (bricksMeta, callback) => {
        const buffers = [];
        const getBricksAsBufferRecursive = (index, callback) => {
            const brickMeta = bricksMeta[index];
            getBrickAsBuffer(brickMeta, (err, data) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get bricks as buffer`, err));
                }

                buffers.push(data);
                ++index;

                if (index < bricksMeta.length) {
                    return getBricksAsBufferRecursive(index, callback);
                }

                const buffer = $$.Buffer.concat(buffers);
                callback(undefined, buffer);
            });
        };

        getBricksAsBufferRecursive(0, callback);
    };

    /**
     * Retrieve all the Bricks identified by `bricksMeta`
     * from storage and create a readable stream
     * from their data
     *
     * @param {Array<object>} bricksMeta
     * @param {callback} callback
     */
    this.createStreamFromBricks = (bricksMeta, callback) => {
        let brickIndex = 0;

        const readableStream = new stream.Readable({
            read(size) {
                if (!bricksMeta.length) {
                    return this.push(null);
                }

                if (brickIndex < bricksMeta.length) {
                    this.readBrickData(brickIndex++);
                }
            }
        });

        // Get a brick and push it into the stream
        readableStream.readBrickData = function (brickIndex) {
            const brickMeta = bricksMeta[brickIndex];
            getBrickAsBuffer(brickMeta, (err, data) => {
                if (err) {
                    this.destroy(err);
                    return;
                }

                this.push(data);

                if (brickIndex >= (bricksMeta.length - 1)) {
                    this.push(null);
                }
            });
        };

        callback(undefined, readableStream);
    };

    /**
     * Retrieve all the Bricks identified by `bricksMeta`
     * and store their data into a file
     *
     * @param {string} filePath
     * @param {Array<object>} bricksMeta
     * @param {callback} callback
     */
    this.createFileFromBricks = (filePath, bricksMeta, callback) => {
        const getBricksAsBufferRecursive = (index, callback) => {
            const brickMeta = bricksMeta[index];

            getBrickAsBuffer(brickMeta, (err, data) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get bricks as buffer`, err));
                }

                this.fsAdapter.appendBlockToFile(filePath, data, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to append block to file <${filePath}>`, err));
                    }

                    ++index;

                    if (index < bricksMeta.length) {
                        return getBricksAsBufferRecursive(index, callback);
                    }

                    callback();
                });
            });
        };

        getBricksAsBufferRecursive(0, callback);
    };

    /**
     * Copy all the Bricks identified by `bricksList`
     * into another storage provider
     *
     * @param {object} bricksList
     * @param {object} options
     * @param {FSAdapter} options.dstStorage
     * @param {callback} options.beforeCopyCallback
     * @param {callback} callback
     */
    this.copyBricks = (bricksList, options, callback) => {
        const bricksSetKeys = Object.keys(bricksList);
        const newBricksSetKeys = {};

        const copyBricksRecursive = (callback) => {
            if (!bricksSetKeys.length) {
                return callback();
            }

            const setKey = bricksSetKeys.shift();
            const bricksMeta = bricksList[setKey];

            const srcStream = createBricksReadableStream(bricksMeta);
            const dstStream = createBricksWritableStream(options.dstStorage, options.beforeCopyCallback);

            srcStream.on('error', (err) => {
                OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to copy bricks`, err));
                dstStream.destroy(err);
            });

            dstStream.on('finish', () => {
                newBricksSetKeys[setKey] = dstStream.bricksSummary;
                dstStream.destroy();
                copyBricksRecursive(callback);
            });

            srcStream.pipe(dstStream);
        };

        copyBricksRecursive((err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to copy bricks recursive`, err));

            }

            callback(undefined, newBricksSetKeys);
        });
    };

    /**
     * @param {string} filePath
     * @param {callback} callback
     */
    this.readFile = (filePath, callback) => {
        this.fsAdapter.getFileSize(filePath, (err, size) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get size for file <${filePath}>`, err));
            }

            if (!size) {
                size = 1;
            }
            this.fsAdapter.readBlockFromFile(filePath, 0, size - 1, callback);
        });
    };
}

module.exports = Service;

},{"../../utils/isStream":"/home/runner/work/privatesky/privatesky/modules/bar/utils/isStream.js","../Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","opendsu":"opendsu","overwrite-require":"overwrite-require","path":false,"stream":false,"swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickStorageService/index.js":[function(require,module,exports){
'use strict'

module.exports = {
    Service: require('./Service')
};

},{"./Service":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickStorageService/Service.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/Manifest.js":[function(require,module,exports){
const MANIFEST_PATH = "/manifest";

function Manifest(archive, callback) {
    const pskPath = require("swarmutils").path;
    let manifest;
    let temporary = {};
    let manifestHandler = {};


    manifestHandler.mount = function (path, archiveIdentifier, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {persist: true};
        }

        if (typeof options === "undefined") {
            options = {persist: true};
        }
        // if (/\W-_/.test(name) === true) {
        //     return callback(Error("Invalid mount name"));
        // }

        for (let mountingPoint in manifest.mounts) {
            if (pskPath.isSubpath(path, mountingPoint) || pskPath.isSubpath(path, mountingPoint)) {
                return callback(Error(`Mount not allowed. Already exist a mount for ${mountingPoint}`));
            }
        }

        manifest.mounts[path] = archiveIdentifier;
        if (options.persist === true) {
            return persist(callback);
        } else {
            temporary[path] = true;
        }

        callback(undefined);
    };

    manifestHandler.unmount = function (path, callback) {
        if (typeof manifest.mounts[path] === "undefined") {
            return callback(Error(`No mount found at path ${path}`));
        }

        delete manifest.mounts[path];

        if (temporary[path]) {
            delete temporary[path];
        } else {
            persist(callback);
        }
    };

    manifestHandler.getArchiveIdentifier = function (path, callback) {
        if (typeof manifest.mounts[path] === "undefined") {
            return callback(Error(`No mount found at path ${path}`));
        }

        callback(undefined, manifest.mounts[path]);
    };

    manifestHandler.getArchiveForPath = function (path, callback) {
        if (path[0] !== '/') {
            path = `/${path}`;
        }
        for (let mountingPoint in manifest.mounts) {
            if (mountingPoint === path) {
                return getArchive(manifest.mounts[mountingPoint], (err, archive) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU mounted at mounting point ${manifest.mounts[mountingPoint]}`, err));
                    }

                    return callback(undefined, {prefixPath: mountingPoint, relativePath: "/", archive: archive, identifier: manifest.mounts[mountingPoint]});
                });
            }

            if (pskPath.isSubpath(path, mountingPoint)) {
                return getArchive(manifest.mounts[mountingPoint], (err, archive) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU mounted at mounting point ${manifest.mounts[mountingPoint]}`, err));
                    }

                    let remaining = path.substring(mountingPoint.length);
                    remaining = pskPath.ensureIsAbsolute(remaining);
                    return archive.getArchiveForPath(remaining, function (err, result) {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU mounted at path ${remaining}`, err));
                        }
                        result.prefixPath = pskPath.join(mountingPoint, result.prefixPath);
                        callback(undefined, result);
                    });
                });
            }
        }

        callback(undefined, {prefixPath: "/", relativePath: path, archive: archive});
    };

    manifestHandler.getMountPoints = function () {
        return Object.keys(manifest.mounts);
    }

    manifestHandler.getMountedDossiers = function (path, callback) {
        let mountedDossiers = [];
        for (let mountPoint in manifest.mounts) {
            if (pskPath.isSubpath(mountPoint, path)) {
                let mountPath = mountPoint.substring(path.length);
                if (mountPath[0] === "/") {
                    mountPath = mountPath.substring(1);
                }
                mountedDossiers.push({
                    path: mountPath,
                    identifier: manifest.mounts[mountPoint]
                });
            }
        }

        const mountPaths = mountedDossiers.map(mountedDossier => mountedDossier.path);
        mountedDossiers = mountedDossiers.filter((mountedDossier, index) => {
            return mountPaths.indexOf(mountedDossier.path) === index;
        });

        callback(undefined, mountedDossiers);
    };

    function getArchive(seed, callback) {
        const resolver = require("opendsu").loadApi("resolver");

        resolver.loadDSU(seed, (err, dossier) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU from keySSI ${seed}`, err));
            }
            callback(undefined, dossier);
        })
    }

    function persist(callback) {
        archive.writeFile(MANIFEST_PATH, JSON.stringify(manifest), callback);
    }

    function init(callback) {
        archive.readFile(MANIFEST_PATH, {ignoreMounts: true}, (err, manifestContent) => {
            if (err) {
                manifest = {mounts: {}};
            } else {
                try {
                    manifest = JSON.parse(manifestContent.toString());
                } catch (e) {
                    return callback(e);
                }
            }

            callback(undefined, manifestHandler);
        });
    }

    init(callback);
}

module.exports.getManifest = function getManifest(archive, callback) {
    Manifest(archive, callback);
};


},{"opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/CompressionTransformation.js":[function(require,module,exports){
const zlib = require("zlib");

function CompressionTransformation(config) {

    this.getInverseTransformParameters = (transformedData) => {
        return {data: transformedData};
    };

    this.createDirectTransform = () => {
        return getCompression(true);
    };

    this.createInverseTransform = () => {
        return getCompression(false);
    };

    function getCompression(isCompression) {
        const algorithm = config.getCompressionAlgorithm();
        switch (algorithm) {
            case "gzip":
                return __createCompress(zlib.gzipSync, zlib.gunzipSync, isCompression);
            case "br":
                return __createCompress(zlib.brotliCompressSync, zlib.brotliDecompressSync, isCompression);
            case "deflate":
                return __createCompress(zlib.deflateSync, zlib.inflateSync, isCompression);
            case "deflateRaw":
                return __createCompress(zlib.deflateRawSync, zlib.inflateRawSync, isCompression);
            default:
                return;
        }
    }

    function __createCompress(compress, decompress, isCompression) {
        const options = config.getCompressionOptions();
        if (!isCompression) {
            return {
                transform(data) {
                    return decompress(data, options);
                }
            }
        }

        return {
            transform(data) {
                return compress(data, options);
            }
        }
    }
}

module.exports = CompressionTransformation;


},{"zlib":false}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/EncryptionTransformation.js":[function(require,module,exports){
const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");

function EncryptionTransformation() {
    this.do = (keySSI, data, callback) => {
        const encrypt = crypto.getCryptoFunctionForKeySSI(keySSI, "encryption");
        let encryptedData;
        try {
            encryptedData = encrypt(data, keySSI.getEncryptionKey());
        } catch (e) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to encrypt data`, e));
        }
        callback(undefined, encryptedData);
    };

    this.undo = (keySSI, data, callback) => {
        const decrypt = crypto.getCryptoFunctionForKeySSI(keySSI, "decryption");
        let plainData;
        try {
            plainData = decrypt(data, keySSI.getEncryptionKey());
        } catch (e) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to decrypt data`, e));
        }
        callback(undefined, plainData);
    };
}

module.exports = EncryptionTransformation;
},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/index.js":[function(require,module,exports){
const CompressionTransformation = require("./CompressionTransformation");
const EncryptionTransformation = require("./EncryptionTransformation");

const createBrickTransformation = (options) => {
    options = options || {};
    return new EncryptionTransformation();
};


module.exports = {
    createBrickTransformation
};


},{"./CompressionTransformation":"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/CompressionTransformation.js","./EncryptionTransformation":"/home/runner/work/privatesky/privatesky/modules/bar/lib/brick-transforms/EncryptionTransformation.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/constants.js":[function(require,module,exports){
'use strict';

module.exports = {
    anchoringStatus: {
        OK: 0,
        PERSIST_BRICKMAP_ERR: -1,
        ANCHOR_VERSION_ERR: -2,
        BRICKMAP_UPDATE_ERR: -3,
        BRICKMAP_LOAD_ERR: -4,
        BRICKMAP_RECONCILE_ERR: -5,
        BRICKMAP_RECONCILIATION_HANDOFF: -6
    }
}

},{}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FileBrickMap.js":[function(require,module,exports){
const Brick = require("../Brick");
const util = require("../../utils/utilities");
const pathModule = "path";
const path = require(pathModule);

function FileBrickMap(header) {
    header = header || {};

    let brickOffset = util.getBrickMapOffsetSize();
    let archiveConfig;
    let encryptionKey;

    this.addFileEntry = (path, bricks) => {
        this.appendBricksToEntry(path, bricks);
    };

    this.appendBricksToEntry = (path, bricks) => {
        for (const data of bricks) {
            this.add(path, data);
        }
    }

    this.add = (filePath, brick) => {
        filePath = filePath.split(path.sep).join(path.posix.sep);
        this.load();
        if (typeof header[filePath] === "undefined") {
            header[filePath] = [];
        }

        const brickObj = {
            checkSum: brick.getAdler32(),
            offset: brickOffset,
            hash: brick.getHash()
        };

        const encKey = brick.getTransformParameters() ? brick.getTransformParameters().key : undefined;
        if (encKey) {
            brickObj.key = encKey;
        }

        header[filePath].push(brickObj);
        brickOffset += brick.getTransformedSize();
    };

    this.getHashList = (filePath) => {
        this.load();
        return header[filePath].map(brickObj => brickObj.offset);
    };

    this.getFileList = (folderBarPath) => {
        this.load();
        if (!folderBarPath) {
            return Object.keys(header);
        }
        return Object.keys(header).filter(fileName => fileName.includes(folderBarPath));
    };

    this.getDictionaryObject = () => {
        let objectDict = {};
        Object.keys(header).forEach((fileName) => {
            let brickObjects = header[fileName];
            for (let j = 0; j < brickObjects.length; j++) {
                if (typeof objectDict[brickObjects[j]['checkSum']] === 'undefined') {
                    objectDict[brickObjects[j]['checkSum']] = [];
                }
                objectDict[brickObjects[j]['checkSum']].push(brickObjects[j]['hash']);
            }
        });
        return objectDict;
    };

    this.getTransformParameters = (brickId) => {
        if (!brickId) {
            return encryptionKey ? {key: encryptionKey} : {};
        }

        this.load();
        let bricks = [];
        const files = this.getFileList();

        files.forEach(filePath => {
            bricks = bricks.concat(header[filePath]);
        });

        const brickObj = bricks.find(brick => {
            return brick.offset === brickId;
        });

        const addTransformData = {};
        if (brickObj.key) {
            addTransformData.key = $$.Buffer.from(brickObj.key);
        }

        return addTransformData;
    };

    this.toBrick = () => {
        this.load();
        const brick = new Brick(archiveConfig);
        brick.setTransformParameters({key: encryptionKey});
        brick.setRawData($$.Buffer.from(JSON.stringify(header)));
        return brick;
    };

    this.load = () => {
        if (header instanceof Brick) {
            header.setConfig(archiveConfig);
            if (encryptionKey) {
                header.setTransformParameters({key: encryptionKey});
            }
            header = JSON.parse(header.getRawData().toString());
        }
    };

    this.setConfig = (config) => {
        archiveConfig = config;
    };

    this.getConfig = () => {
        return archiveConfig;
    };

    this.setEncryptionKey = (encKey) => {
        encryptionKey = encKey;
    };

    this.removeFile = (filePath) => {
        this.load();
        delete header[filePath];
    };
}

module.exports = FileBrickMap;

},{"../../utils/utilities":"/home/runner/work/privatesky/privatesky/modules/bar/utils/utilities.js","../Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FileBrickStorage.js":[function(require,module,exports){
function FileBrickStorage(filePath) {
    const fsModuleName = "fs";
    const fs = require(fsModuleName);
    const BrickMap = require("./FileBrickMap");
    const util = require("../../utils/utilities");
    const Brick = require("../Brick");

    let isFirstBrick = true;
    let map;
    let mapOffset;

    this.setBrickMap = (brickMap) => {
        map = brickMap;
    };

    this.putBrick = (brick, callback) => {
        if (isFirstBrick) {
            isFirstBrick = false;
            const writeStream = fs.createWriteStream(filePath, {start: util.getBrickMapOffsetSize()});
            writeStream.on("error", (err) => {
                return callback(err);
            });

            writeStream.write(brick.getTransformedData(), callback);
        } else {
            fs.appendFile(filePath, brick.getTransformedData(), callback);
        }
    };

    this.getBrick = (brickId, callback) => {
        this.getBrickMap((err, brickMap) => {
            if (err) {
                return callback(err);
            }
            let brickOffsets = [];
            const fileList = brickMap.getFileList();
            fileList.forEach(file => {
                brickOffsets = brickOffsets.concat(brickMap.getHashList(file));
            });

            const brickIndex = brickOffsets.findIndex(el => {
                return el === brickId;
            });

            let nextBrickId = brickOffsets[brickIndex + 1];
            if (!nextBrickId) {
                nextBrickId = Number(mapOffset);
            }

            readBrick(brickId, nextBrickId, callback);
        });

    };

    this.deleteFile = (fileName, callback) => {
        this.getBrickMap((err, brickMap) => {
            if (err) {
                return callback(err);
            }

            brickMap.delete(fileName);
            this.putBrickMap(brickMap, callback);
        });
    };


    this.putBrickMap = (brickMap, callback) => {
        map = brickMap;
        readBrickMapOffset((err, offset) => {
            if(offset) {
                offset = Number(offset);
                fs.truncate(filePath, offset, (err) => {
                    if (err) {
                        return callback(err);
                    }

                    __writeBrickMap(offset);
                });
            }else{
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        return callback(err);
                    }

                    const brickMapOffset = stats.size;

                    const bufferBrickMapOffset = $$.Buffer.alloc(util.getBrickMapOffsetSize());
                    bufferBrickMapOffset.writeBigUInt64LE(BigInt(brickMapOffset));
                    mapOffset = brickMapOffset;
                    const offsetWriteStream = fs.createWriteStream(filePath, {flags: "r+", start: 0});

                    offsetWriteStream.on("error", (err) => {
                        return callback(err);
                    });

                    offsetWriteStream.write(bufferBrickMapOffset, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        __writeBrickMap(brickMapOffset);
                    });
                });
            }
        });

        function __writeBrickMap(offset) {
            const mapWriteStream = fs.createWriteStream(filePath, {flags: "r+", start: offset});
            mapWriteStream.on("error", (err) => {
                return callback(err);
            });

            const mapBrick = brickMap.toBrick();
            mapBrick.setTransformParameters(brickMap.getTransformParameters());
            mapWriteStream.write(mapBrick.getTransformedData(), callback);
        }

    };

    this.getBrickMap = (mapDigest, callback) => {
        if (typeof mapDigest === "function") {
            callback = mapDigest;
        }

        if (map) {
            return callback(undefined, map);
        }

        readBrickMap((err, brickMap) => {
            if (err) {
                return callback(err);
            }

            map = brickMap;
            callback(undefined, brickMap);
        });
    };

    //------------------------------------------ Internal functions ---------------------------------------------------

    function readBrickMapOffset(callback) {
        const readStream = fs.createReadStream(filePath, {start: 0, end: util.getBrickMapOffsetSize() - 1});

        const buffer = $$.Buffer.alloc(util.getBrickMapOffsetSize());
        let offsetBuffer = 0;

        readStream.on("data", (chunk) => {
            chunk.copy(buffer, offsetBuffer);
            offsetBuffer += chunk.length;
        });

        readStream.on("end", () => {
            callback(undefined, buffer.readBigUInt64LE());
        });

        readStream.on("error", (err) => {
            return callback(err);
        });
    }

    function readBrickMap(callback) {
        readBrickMapOffset((err, brickMapOffset) => {
            if (err) {
                if (err.code === "ENOENT") {
                    return callback(undefined, new BrickMap());
                }

                return callback(err)
            }

            mapOffset = brickMapOffset;
            const readStream = fs.createReadStream(filePath, {start: Number(brickMapOffset)});
            const buffs = [];

            readStream.on("data", (chunk) => {
                buffs.push(chunk);
            });

            readStream.on("error", (err) => {
                return callback(err);
            });

            readStream.on("end", () => {
                const brickMapData = $$.Buffer.concat(buffs);
                const mapBrick = new Brick();
                mapBrick.setTransformedData(brickMapData);
                callback(undefined, new BrickMap(mapBrick));
            });
        });
    }

    function readBrick(brickOffsetStart, brickOffsetEnd, callback) {
        const readStream = fs.createReadStream(filePath, {start: brickOffsetStart, end: brickOffsetEnd - 1});
        const buffs = [];

        readStream.on("data", (chunk) => {
            buffs.push(chunk);
        });

        readStream.on("error", (err) => {
            return callback(err);
        });

        readStream.on("end", () => {
            const brick = new Brick();
            const brickData = $$.Buffer.concat(buffs);
            brick.setTransformedData(brickData);
            callback(undefined, brick);
        });
    }
}

module.exports = {
    createFileBrickStorage(filePath) {
        return new FileBrickStorage(filePath);
    }
};

},{"../../utils/utilities":"/home/runner/work/privatesky/privatesky/modules/bar/utils/utilities.js","../Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","./FileBrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FileBrickMap.js"}],"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FolderBrickStorage.js":[function(require,module,exports){
const BrickMap = require("../BrickMap");
const Brick = require("../Brick");

function FolderBrickStorage(location) {
    const fs = require("fs");
    const path = require("path");
    let map;

    this.setBrickMap = (brickMap) => {
        map = brickMap;
    };

    this.putBrick = (brick, callback) => {
        const writeStream = fs.createWriteStream(path.join(location, brick.getHash()));
        writeStream.write(brick.getTransformedData(), (...args) => {
            writeStream.end();
            callback(...args);
        });
    };

    this.getBrick = (brickHash, callback) => {
        fs.readFile(path.join(location, brickHash), (err, brickData) => {
            if (err) {
                return callback(err);
            }

            const brick = new Brick();
            brick.setTransformedData(brickData);
            callback(err, brick);
        });
    };

    this.deleteFile = (filePath, callback) => {
        this.getBrickMap((err, brickMap) => {
            if (err) {
                return callback(err);
            }

            fs.unlink(path.join(location, brickMap.toBrick().getHash()), (err) => {
                if (err) {
                    return callback(err);
                }

                brickMap.delete(filePath);
                this.putBrickMap(brickMap, callback);
            });
        });
    };

    this.putBrickMap = (brickMap, callback) => {
        map = brickMap;
        const brickMapBrick = brickMap.toBrick();
        brickMapBrick.setTransformParameters(brickMap.getTransformParameters());
       
        let brickId = brickMapBrick.getKey();
        if (!brickId) {
            brickId = brickMapBrick.getHash();
        }

        brickMapBrick.setKey(brickId);
        const writeStream = fs.createWriteStream(path.join(location, brickId));
        writeStream.write(brickMapBrick.getTransformedData(), (err) => {
            writeStream.end();
            callback(err, brickMapBrick.getSeed());
        });
    };

    this.getBrickMap = (mapDigest, callback) => {
        if (typeof mapDigest === "function") {
            callback = mapDigest;
            mapDigest = undefined;
        }

        if (map) {
            return callback(undefined, map);
        }

        if (typeof mapDigest === "undefined") {
            return callback(undefined, new BrickMap());
        }

        this.getBrick(mapDigest, (err, mapBrick) => {
            if (err) {
                return callback(err);
            }

            const brickMap = new BrickMap(mapBrick);
            map = brickMap;
            callback(undefined, brickMap);
        });
    }
}

module.exports = {
    createFolderBrickStorage(location) {
        return new FolderBrickStorage(location);
    }
};

},{"../Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","../BrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js","fs":false,"path":false}],"/home/runner/work/privatesky/privatesky/modules/bar/utils/isStream.js":[function(require,module,exports){
function isStream(stream){
    return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
}

function isWritable(stream) {
    return isStream(stream) &&
        stream.writable !== false &&
        typeof stream._write === 'function' &&
        typeof stream._writableState === 'object';

}

function isReadable(stream) {
    return isStream(stream) &&
        stream.readable !== false &&
        typeof stream._read === 'function' &&
        typeof stream._readableState === 'object';
}

function isDuplex(stream){
    return isWritable(stream) &&
        isReadable(stream);
}

module.exports = {
    isStream,
    isReadable,
    isWritable,
    isDuplex
};

},{}],"/home/runner/work/privatesky/privatesky/modules/bar/utils/utilities.js":[function(require,module,exports){
const OFFSET_SIZE = 8;

function getBrickMapOffsetSize() {
    return OFFSET_SIZE;
}

function ensureFileDoesNotExist(filePath, callback) {
    const fs = require('fs');
    fs.access(filePath, (err) => {
        if (!err) {
            fs.unlink(filePath, callback);
        } else {
            return callback();
        }
    });
}

module.exports = {getBrickMapOffsetSize, ensureFileDoesNotExist};
},{"fs":false}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsMixin.js":[function(require,module,exports){
function CryptoAlgorithmsMixin(target) {
    target = target || {};
    const crypto = require("pskcrypto");

    target.hash = (data) => {
        return target.encoding(crypto.hash('sha256', data));
    }

    target.keyDerivation = (password, iterations) => {
        return crypto.deriveKey('aes-256-gcm', password, iterations);
    }

    target.encryptionKeyGeneration = () => {
        const pskEncryption = crypto.createPskEncryption('aes-256-gcm');
        return pskEncryption.generateEncryptionKey();
    }

    target.encryption = (plainData, encryptionKey, options) => {
        const pskEncryption = crypto.createPskEncryption('aes-256-gcm');
        return pskEncryption.encrypt(plainData, encryptionKey, options);
    }

    target.decryption = (encryptedData, decryptionKey, authTagLength, options) => {
        const pskEncryption = crypto.createPskEncryption('aes-256-gcm');
        const utils = require("swarmutils");
        if (!$$.Buffer.isBuffer(decryptionKey) && (decryptionKey instanceof ArrayBuffer || ArrayBuffer.isView(decryptionKey))) {
            decryptionKey = utils.ensureIsBuffer(decryptionKey);
        }
        if (!$$.Buffer.isBuffer(encryptedData) && (decryptionKey instanceof ArrayBuffer || ArrayBuffer.isView(decryptionKey))) {
            encryptedData = utils.ensureIsBuffer(encryptedData);
        }
        return pskEncryption.decrypt(encryptedData, decryptionKey, 16, options);
    }

    target.encoding = (data) => {
        return crypto.pskBase58Encode(data);
    }

    target.decoding = (data) => {
        return crypto.pskBase58Decode(data);
    }

    target.keyPairGenerator = () => {
        return crypto.createKeyPairGenerator();
    }

    target.convertPublicKey = (rawPublicKey, options) => {
        const keyGenerator = crypto.createKeyPairGenerator();
        return keyGenerator.convertPublicKey(rawPublicKey, options);
    };

    target.verify = (data, publicKey, signature) => {
        return crypto.verify('sha256', data, publicKey, signature);
    }

    target.ecies_encryption = (receiverPublicKey, message) => {
        return crypto.ecies_encrypt(receiverPublicKey, message, target.getConfigForIES())
    };

    target.ecies_decryption = (receiverPrivateKey, encEnvelope) => {
        return crypto.ecies_decrypt(receiverPrivateKey, encEnvelope, target.getConfigForIES());
    };

    target.ecies_encryption_ds = (senderKeyPair, receiverPublicKey, message) => {
        return crypto.ecies_encrypt_ds(senderKeyPair, receiverPublicKey, message, target.getConfigForIES())
    };

    target.ecies_decryption_ds = (receiverPrivateKey, encEnvelope) => {
        return crypto.ecies_decrypt_ds(receiverPrivateKey, encEnvelope, target.getConfigForIES());
    };

    target.ecies_encryption_kmac = (senderKeyPair, receiverPublicKey, message) => {
        return crypto.ecies_encrypt_kmac(senderKeyPair, receiverPublicKey, message, target.getConfigForIES())
    };

    target.ecies_decryption_kmac = (receiverPrivateKey, encEnvelope) => {
        return crypto.ecies_decrypt_kmac(receiverPrivateKey, encEnvelope, target.getConfigForIES());
    };

    let config = {
        curveName: 'secp256k1',
        encodingFormat: 'base64',
        macAlgorithmName: 'sha256',
        macKeySize: 16,
        hashFunctionName: 'sha256',
        hashSize: 32,
        signAlgorithmName: 'sha256',
        symmetricCipherName: 'aes-128-cbc',
        symmetricCipherKeySize: 16,
        ivSize: 16
    };

    target.getConfigForIES = () => {
        return config;
    };

    target.setConfigForIES = (_config)=>{
        config = _config;
    }

    return target;
}

module.exports = CryptoAlgorithmsMixin;

},{"pskcrypto":"pskcrypto","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js":[function(require,module,exports){
const SSITypes = require("../KeySSIs/SSITypes");
const CryptoFunctionTypes = require("./CryptoFunctionTypes");
const CryptoAlgorithmsMixin = require("./CryptoAlgorithmsMixin");
const SeedSSICryptoAlgorithms = require("./SeedSSICryptoAlgorithms");
const cryptoInterfaces = {};

const registerCryptoInterface = (keySSIType, vn, cryptoInterface)=>{
    if (typeof cryptoInterfaces[keySSIType] !== "undefined" && typeof cryptoInterfaces[keySSIType][vn] !== "undefined") {
        throw Error(`A crypto interface for Key SSI ${keySSIType} is already registered for version ${vn}`);
    }

    if (typeof cryptoInterfaces[keySSIType] === "undefined") {
        cryptoInterfaces[keySSIType] = {};
    }

    cryptoInterfaces[keySSIType][vn] = cryptoInterface;
};

const getCryptoFunction = (keySSI, algorithmType) => {
    let cryptoFunction;
    try {
        cryptoFunction = cryptoInterfaces[keySSI.getTypeName()][keySSI.getVn()][algorithmType];
    } catch (e) {
        throw Error(`Algorithm type <${algorithmType}> not recognized for <${keySSI.getIdentifier(true)}>`);
    }

    if (typeof cryptoFunction === "undefined") {
        throw Error(`Algorithm type <${algorithmType}> not recognized for <${keySSI.getIdentifier(true)}>`);
    }
    return cryptoFunction;
};

function CryptoAlgorithmsRegistry() {
}
module.exports = new CryptoAlgorithmsRegistry();
CryptoAlgorithmsRegistry.prototype.getHashFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.HASH);
};

CryptoAlgorithmsRegistry.prototype.getKeyDerivationFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.KEY_DERIVATION);
};

CryptoAlgorithmsRegistry.prototype.getEncryptionFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.ENCRYPTION);
};

CryptoAlgorithmsRegistry.prototype.getEncryptionKeyGenerationFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.ENCRYPTION_KEY_GENERATION);
};

CryptoAlgorithmsRegistry.prototype.getDecryptionFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.DECRYPTION);
};

CryptoAlgorithmsRegistry.prototype.getEncodingFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.ENCODING);
};

CryptoAlgorithmsRegistry.prototype.getDecodingFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.DECODING);
};

CryptoAlgorithmsRegistry.prototype.getKeyPairGenerator = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.KEY_PAIR_GENERATOR);
};

CryptoAlgorithmsRegistry.prototype.getSignFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.SIGN);
};

CryptoAlgorithmsRegistry.prototype.getVerifyFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.VERIFY);
};

CryptoAlgorithmsRegistry.prototype.getDerivePublicKeyFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.DERIVE_PUBLIC_KEY);
};

CryptoAlgorithmsRegistry.prototype.getConvertPublicKeyFunction = (keySSI) => {
    return getCryptoFunction(keySSI, CryptoFunctionTypes.CONVERT_PUBLIC_KEY);
};

CryptoAlgorithmsRegistry.prototype.getCryptoFunction = getCryptoFunction;
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface = registerCryptoInterface;

CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.SEED_SSI, 'v0',  new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.WALLET_SSI, 'v0', new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.SREAD_SSI, 'v0',  new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.SZERO_ACCESS_SSI, 'v0', new CryptoAlgorithmsMixin());

CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.PASSWORD_SSI, 'v0', new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.ARRAY_SSI, 'v0',  new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.CONST_SSI, 'v0', new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.CONSTANT_ZERO_ACCESS_SSI, 'v0',new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.HASH_LINK_SSI, 'v0',  new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, 'v0',new CryptoAlgorithmsMixin());

CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.TOKEN_SSI, 'v0',  new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.OWNERSHIP_SSI, 'v0', new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.OWNERSHIP_READ_SSI, 'v0', new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.TRANSFER_SSI, 'v0',  new SeedSSICryptoAlgorithms());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.ZERO_ACCESS_TOKEN_SSI, 'v0', new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.SIGNED_HASH_LINK_SSI, 'v0',  new CryptoAlgorithmsMixin());

CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.CONSENSUS_SSI, 'v0',  new CryptoAlgorithmsMixin());
CryptoAlgorithmsRegistry.prototype.registerCryptoInterface(SSITypes.PUBLIC_KEY_SSI, 'v0',  new CryptoAlgorithmsMixin());


},{"../KeySSIs/SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./CryptoAlgorithmsMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsMixin.js","./CryptoFunctionTypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoFunctionTypes.js","./SeedSSICryptoAlgorithms":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/SeedSSICryptoAlgorithms.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoFunctionTypes.js":[function(require,module,exports){
module.exports = {
    HASH: "hash",
    ENCRYPTION: "encryption",
    DECRYPTION: "decryption",
    ECIES_ENCRYPTION: "ecies_encryption",
    ECIES_DECRYPTION: "ecies_decryption",
    ECIES_ENCRYPTION_KMAC: "ecies_encryption_kmac",
    ECIES_DECRYPTION_KMAC: "ecies_decryption_kmac",
    ECIES_ENCRYPTION_DS: "ecies_encryption_ds",
    ECIES_DECRYPTION_DS: "ecies_decryption_ds",
    ENCRYPTION_KEY_GENERATION: "encryptionKeyGeneration",
    KEY_DERIVATION: "keyDerivation",
    ENCODING: "encoding",
    DECODING: "decoding",
    SIGN: "sign",
    VERIFY: "verify",
    DERIVE_PUBLIC_KEY: "derivePublicKey",
    CONVERT_PUBLIC_KEY: "convertPublicKey",
    KEY_PAIR_GENERATOR: "keyPairGenerator",
    GET_IES_CONFIG: "getConfigForIES",
    SET_IES_CONFIG: "setConfigForIES",
};

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/SeedSSICryptoAlgorithms.js":[function(require,module,exports){
function SeedSSICryptoAlgorithms() {
    const crypto = require("pskcrypto");
    const CryptoAlgorithmsMixin = require("./CryptoAlgorithmsMixin");
    CryptoAlgorithmsMixin(this);
    const self = this;

    self.sign = (data, privateKey) => {
        const keyGenerator = crypto.createKeyPairGenerator();
        const rawPublicKey = keyGenerator.getPublicKey(privateKey, 'secp256k1');
        return crypto.sign('sha256', data, keyGenerator.getPemKeys(privateKey, rawPublicKey).privateKey);
    }

    self.derivePublicKey =  (privateKey, format) => {
        if (typeof format === "undefined") {
            format = "pem";
        }
        const keyGenerator = crypto.createKeyPairGenerator();
        let publicKey = keyGenerator.getPublicKey(privateKey, 'secp256k1');
        switch(format){
            case "raw":
                return publicKey;
            case "pem":
                return keyGenerator.getPemKeys(privateKey, publicKey).publicKey;
            default:
                throw Error("Invalid format name");
        }
    }
}

module.exports = SeedSSICryptoAlgorithms;

},{"./CryptoAlgorithmsMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsMixin.js","pskcrypto":"pskcrypto"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/ConsensusDSUFactory.js":[function(require,module,exports){
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
function ConsensusDSUFactory(options) {
    options = options || {};
    this.barFactory = options.barFactory;

    /**
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.create = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (typeof options === "undefined") {
            options = {};
        }

        if(typeof options.useSSIAsIdentifier === "undefined" || !options.useSSIAsIdentifier){
            throw Error("Creating a DSU using keySSI from the ConsensusSSI family not allowed. Use the resolver.createDSUForExisting method instead.");
        }

        // enable options.validationRules.preWrite to stop content update
        this.barFactory.create(keySSI, options, callback);
    };

    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // enable options.validationRules.preWrite to stop content update
        this.barFactory.load(keySSI, options, callback);
    };
}

module.exports = ConsensusDSUFactory;

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/ConstDSUFactory.js":[function(require,module,exports){
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
function ConstDSUFactory(options) {
    options = options || {};
    this.barFactory = options.barFactory;

    /**
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.create = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if(typeof options.useSSIAsIdentifier === "undefined" || !options.useSSIAsIdentifier){
            throw Error("Creating a DSU using keySSI from the arraySSI family not allowed. Use the resolver.createDSUForExisting method instead.");
        }
        //preventing default mechanism that forces an anchor at the dsu creation
        options.addLog = false;
        //testing if a constDSU already exists in order to prevent new instances
        this.barFactory.load(keySSI, options, (err, loadedInstance)=>{
            if(!err){
                return callback(new Error("ConstDSU already exists! Can't be created again."));
            }
            // enable options.validationRules.preWrite to stop content update
            this.barFactory.create(keySSI, options, callback);
        });
    };

    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // enable options.validationRules.preWrite to stop content update
        this.barFactory.load(keySSI, options, callback);
    };
}

module.exports = ConstDSUFactory;

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/DSUFactory.js":[function(require,module,exports){
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
const cache = require('psk-cache').factory();
function DSUFactory(options) {
    const barModule = require('bar');
    const fsAdapter = require('bar-fs-adapter');
    const MAX_BRICK_SIZE = 1000000;
    options = options || {};
    this.keySSIFactory = options.keySSIFactory;
    this.brickMapStrategyFactory = options.brickMapStrategyFactory;


    function castSSI(ssi){
        if(typeof ssi !== "undefined"){
            if(typeof ssi === "string"){
                let keyssi = require("opendsu").loadApi("keyssi");
                ssi = keyssi.parse(ssi);
            } else {
                 if(ssi.getTypeName === undefined || ssi.getIdentifier === undefined){
                     throw Error("Please provide a proper SSI instance ");
                 }
            }
        } else {
            throw Error("SSI should not be undefined");
        }
        return ssi;
    }

    let forcedArchiveSingletonsCache = {};


    ////////////////////////////////////////////////////////////
    // Private methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {SeedSSI} keySSI
     * @param {object} options
     * @return {Archive}
     */
    const createInstance = (keySSI, options, initializationMethod, callback) => {
        const INIT = "init";
        const allowedInitMethods = [INIT, "load"];
        if(allowedInitMethods.indexOf(initializationMethod) === -1){
            throw Error("wrong usage of the createInstace method");
        }

        let bar;
        try{
            let identifier = keySSI;
            if(typeof identifier == "string"){
                let bar = forcedArchiveSingletonsCache[identifier];
                if(bar) return bar;
            }

            const ArchiveConfigurator = barModule.ArchiveConfigurator;
            ArchiveConfigurator.prototype.registerFsAdapter("FsAdapter", fsAdapter.createFsAdapter);
            const archiveConfigurator = new ArchiveConfigurator();
            archiveConfigurator.setCache(cache);
            const envTypes = require("overwrite-require").constants;
            if($$.environmentType !== envTypes.BROWSER_ENVIRONMENT_TYPE &&
                $$.environmentType !== envTypes.SERVICE_WORKER_ENVIRONMENT_TYPE &&
                $$.environmentType !== envTypes.WEB_WORKER_ENVIRONMENT_TYPE){
                archiveConfigurator.setFsAdapter("FsAdapter");
            }
            archiveConfigurator.setBufferSize(MAX_BRICK_SIZE);
            archiveConfigurator.setKeySSI(keySSI);
            let brickMapStrategyName = options.brickMapStrategy;
            let anchoringOptions = options.anchoringOptions;

            let brickMapStrategy = createBrickMapStrategy(brickMapStrategyName, anchoringOptions);
            archiveConfigurator.setBrickMapStrategy(brickMapStrategy);

            if (options.validationRules) {
                archiveConfigurator.setValidationRules(options.validationRules);
            }

            bar = barModule.createArchive(archiveConfigurator);
            const DSUBase = require("./mixins/DSUBase");
            DSUBase(bar);
            forcedArchiveSingletonsCache[identifier] = bar;

        }catch(err){
            return callback(err);
        }

        let defaultCallback = err => {
            callback(err, bar)
        };

        let initCallback = (err) => {
            if (err) {
                return callback(err);
            }

            if (typeof options === "object" && options.addLog) {
                return bar.dsuLog("DSU created on " + Date.now(), defaultCallback);
            }

            callback(err, bar);
        }

        bar[initializationMethod](initializationMethod === INIT ? initCallback : defaultCallback);
    }

    /**
     * @return {object}
     */
    const createBrickMapStrategy = (name, options) => {
        const strategy = this.brickMapStrategyFactory.create(name, options);
        return strategy;
    }

    /**
     * @return {SecretDID}
     * @param templateKeySSI
     * @param callback
     */
    const initializeKeySSI = (templateKeySSI, callback) => {
        if (typeof templateKeySSI === "function") {
            callback = templateKeySSI;
            templateKeySSI = undefined;
        }

        if (typeof templateKeySSI === "undefined") {
            return callback(Error("A template keySSI should be provided when creating a new DSU."));
        }
        const KeySSIFactory = require("../KeySSIs/KeySSIFactory");
        const keySSI = KeySSIFactory.createType(templateKeySSI.getTypeName());
        keySSI.initialize(templateKeySSI.getDLDomain(), undefined, undefined, undefined, templateKeySSI.getHint(), callback);
        // keySSI.initialize(templateKeySSI.getDLDomain(), templateKeySSI.getSpecificString(), templateKeySSI.getControlString(), templateKeySSI.getVn(), templateKeySSI.getHint(), callback);
    }

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.create = (keySSI, options, callback) => {
        keySSI = castSSI(keySSI);
        if(typeof options === "function"){
            callback = options;
            options = undefined;
        }
        options = options || {};
        if (options.useSSIAsIdentifier) {
            return createInstance(keySSI, options, "init", callback);
        }

        initializeKeySSI(keySSI, (err, _keySSI) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to initialize keySSI <${keySSI.getIdentifier(true)}>`, err));
            }
            return createInstance(_keySSI, options, "init", callback);
        });
    }

    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, options, callback) => {
        keySSI = castSSI(keySSI);
        if(typeof options === "function"){
            callback = options;
            options = undefined;
        }
        options = options || {};
        createInstance(keySSI, options, "load", callback);
    }
}

module.exports = DSUFactory;

},{"../KeySSIs/KeySSIFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIFactory.js","./mixins/DSUBase":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/mixins/DSUBase.js","bar":"bar","bar-fs-adapter":"bar-fs-adapter","opendsu":"opendsu","overwrite-require":"overwrite-require","psk-cache":"psk-cache"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/OwnershipDSUFactory.js":[function(require,module,exports){
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
function OwnershipDSUFactory(options) {
    options = options || {};
    this.barFactory = options.barFactory;

    /**
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.create = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (typeof options === "undefined") {
            options = {};
        }

        if(typeof options.useSSIAsIdentifier === "undefined" || !options.useSSIAsIdentifier){
            throw Error("Creating a DSU using keySSI from the OwnershipSSI family not allowed. Use the resolver.createDSUForExisting method instead.");
        }

        // enable options.validationRules.preWrite to stop content update
        this.barFactory.create(keySSI, options, callback);
    };

    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // enable options.validationRules.preWrite to stop content update
        this.barFactory.load(keySSI, options, callback);
    };
}

module.exports = OwnershipDSUFactory;

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/WalletFactory.js":[function(require,module,exports){
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
function WalletFactory(options) {
    options = options || {};
    this.dsuFactory = options.barFactory;
    const WALLET_MOUNT_POINT = "/writableDSU";
    /**
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {object} options.walletKeySSI - KeySSI of the wallet to be mounted in constDSUWallet
     * @param {callback} callback
     */
    this.create = (keySSI, options, callback) => {
        const defaultOpts = {overwrite: false};

        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        let writableWallet;
        let constDSUWallet;

        Object.assign(defaultOpts, options);
        options = defaultOpts;

        let createWritableDSU = () => {
            let templateSSI = require("opendsu").loadApi("keyssi").createTemplateSeedSSI(keySSI.getDLDomain(),undefined,undefined,undefined,keySSI.getHint());
            this.dsuFactory.create(templateSSI, (err, writableDSU) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create writable using templateSSI <${templateSSI.getIdentifier(true)}>`, err));
                }
                writableWallet = writableDSU;
                mountDSUType();
            })
        }

        let mountDSUType = () =>{
            writableWallet.mount("/code", options.dsuTypeSSI, (err => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to mount constitution in writable DSU`, err));
                }
                createConstDSU();
            }));
        }

        let createConstDSU = () => {
                this.dsuFactory.create(keySSI, options, (err, constWallet) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create ConstDSU using keySSI <${keySSI.getIdentifier(true)}>`, err));
                }

                constDSUWallet = constWallet;
                constDSUWallet.getWritableDSU = function(){
                    return writableWallet;
                }
                mountWritableWallet();
            })
        }


        let mountWritableWallet = () => {
            writableWallet.getKeySSIAsString((err, seedSSI) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get seedSSI", err));
                }
                constDSUWallet.mount(WALLET_MOUNT_POINT, seedSSI, (err => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to mount writable SSI in wallet", err));
                    }
                    callback(undefined, constDSUWallet);
                }));
            });
        }

        if (options.walletKeySSI) {
            this.dsuFactory.load(options.walletKeySSI, (err, dsu) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load writable DSU from ConstDSU Wallet ------->>>>>>", err));
                }
                writableWallet = dsu;
                createConstDSU();
            });
        } else {
            createWritableDSU();
        }

    };




    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, options, callback) => {
        const defaultOpts = {overwrite: false};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        let constDSU;
        let writableDSU;
        let writableSSI;

        let loadConstDSU = () =>{
            this.dsuFactory.load(keySSI, options, (err, dsu) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load ConstDSU",err));
                }
                constDSU = dsu;
                getSSIFromMountPoint();
            });
        }


        let  getSSIFromMountPoint = () => {
            constDSU.getSSIForMount(WALLET_MOUNT_POINT, (err, ssi) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get mount point in ConstDSU",err));
                }
                writableSSI = require("opendsu").loadApi("keyssi").parse(ssi);
                loadWritableDSU();
            });
        }

        let loadWritableDSU = () => {
            this.dsuFactory.load(writableSSI, options, (err, dsu) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to load writable DSU from ConstDSU Wallet", err));
                }
                writableDSU = dsu;
                constDSU.getWritableDSU = function(){
                    return writableDSU;
                }
                return callback(undefined, constDSU);
            });
        }


        loadConstDSU();

    };
}

module.exports = WalletFactory;

},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/index.js":[function(require,module,exports){
const BarFactory = require('./DSUFactory');
const SSITypes = require("../KeySSIs/SSITypes");
/**
 * @param {object} options
 * @param {KeySSIFactory} options.keySSIFactory
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 */
const factories = {};

function Registry(options) {
    options = options || {};

    const keySSIFactory = options.keySSIFactory;
    const brickMapStrategyFactory = options.brickMapStrategyFactory

    if (!keySSIFactory) {
        throw new Error('A KeySSI factory is required');
    }

    if (!brickMapStrategyFactory) {
        throw new Error('A BrickMapStratregy factory is required');
    }

    /**
     * Initialize the factory state
     */
    const initialize = () => {
        const barFactory = new BarFactory({
            keySSIFactory,
            brickMapStrategyFactory
        });

        this.registerDSUType(SSITypes.SEED_SSI, barFactory);
        this.registerDSUType(SSITypes.SREAD_SSI, barFactory);
        const WalletFactory = require("./WalletFactory");
        const walletFactory = new WalletFactory({barFactory});
        this.registerDSUType(SSITypes.WALLET_SSI, walletFactory);
        const ConstDSUFactory = require("./ConstDSUFactory");
        const constDSUFactory = new ConstDSUFactory({barFactory});
        this.registerDSUType(SSITypes.CONST_SSI, constDSUFactory);
        this.registerDSUType(SSITypes.ARRAY_SSI, constDSUFactory);

        const OwnershipDSUFactory = require("./OwnershipDSUFactory");
        const ownershipDSUFactory = new OwnershipDSUFactory({barFactory})
        this.registerDSUType(SSITypes.OWNERSHIP_SSI, ownershipDSUFactory);
        this.registerDSUType(SSITypes.OWNERSHIP_READ_SSI, ownershipDSUFactory);

        const ConsensusDSUFactory = require("./ConsensusDSUFactory");
        const consensusDSUFactory = new ConsensusDSUFactory({barFactory});
        this.registerDSUType(SSITypes.CONSENSUS_SSI, consensusDSUFactory);
    }

    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {string} representation
     * @return {boolean}
     */
    this.isValidKeySSI = (keySSI) => {
        try{
            return typeof factories[keySSI.getTypeName()] !== 'undefined';
        } catch(err){
            return false;
        }
    };


    /**
     * @param {object} keySSI
     * @param {object} dsuConfiguration
     * @param {string} dsuConfiguration.brickMapStrategyFactory 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} dsuConfiguration.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} dsuConfiguration.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} dsuConfiguration.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} dsuConfiguration.anchoringOptions.anchoringCb A callback which is called when the strategy anchors the changes
     * @param {callback} dsuConfiguration.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} dsuConfiguration.validationRules
     * @param {object} dsuConfiguration.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.create = (keySSI, dsuConfiguration, callback) => {
        let type = keySSI.getTypeName();
        if (keySSI.options && keySSI.options.dsuFactoryType) {
            type = keySSI.options.dsuFactoryType;
        }
        const factory = factories[type];
        factory.create(keySSI, dsuConfiguration, callback);
    }

    /**
     * @param {object} keySSI
     * @param {string} representation
     * @param {object} dsuConfiguration
     * @param {string} dsuConfiguration.brickMapStrategyFactory 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} dsuConfiguration.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} dsuConfiguration.anchoringOptions.decisionFn Callback which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} dsuConfiguration.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} dsuConfiguration.anchoringOptions.anchoringCb A callback which is called when the strategy anchors the changes
     * @param {callback} dsuConfiguration.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} dsuConfiguration.validationRules
     * @param {object} dsuConfiguration.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.load = (keySSI, dsuConfiguration, callback) => {
        let type = keySSI.getTypeName();
        if (keySSI.options && keySSI.options.dsuFactoryType) {
            type = keySSI.options.dsuFactoryType;
        }
        const factory = factories[type];
        return factory.load(keySSI, dsuConfiguration, callback);
    }

    initialize();
}

/**
 * @param {string} dsuType
 * @param {object} factory
 */
Registry.prototype.registerDSUType = (dsuType, factory) => {
    factories[dsuType] = factory;
}

Registry.prototype.getDSUFactory = (dsuType) => {
    return factories[dsuType];
}

module.exports = Registry;

},{"../KeySSIs/SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ConsensusDSUFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/ConsensusDSUFactory.js","./ConstDSUFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/ConstDSUFactory.js","./DSUFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/DSUFactory.js","./OwnershipDSUFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/OwnershipDSUFactory.js","./WalletFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/WalletFactory.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/mixins/DSUBase.js":[function(require,module,exports){
module.exports = function(archive){
	archive.call = (functionName, ...args) => {
		if(args.length === 0){
			throw Error('Missing arguments. Usage: call(functionName, [arg1, arg2 ...] callback)');
		}
		const callback = args.pop();
		if(typeof  callback !== "function"){
			throw Error('Last argument is always a callback function. Usage: call(functionName, [arg1, arg2 ...] callback)');
		}

		let evaluatedAPICode;

		function doEval(apiCode){
			const or = require("overwrite-require");

			switch($$.environmentType){
				case or.constants.BROWSER_ENVIRONMENT_TYPE:
				case or.constants.WEB_WORKER_ENVIRONMENT_TYPE:
				case or.constants.SERVICE_WORKER_ENVIRONMENT_TYPE:
					apiCode = new TextDecoder("utf-8").decode(apiCode);
					break;
				default:
					apiCode = apiCode.toString();
			}
			apiCode = "let module = {exports: {}}\n" + apiCode + "\nmodule.exports";
			evaluatedAPICode = eval(apiCode);
		}

		function execute(){
			try{
				//before eval we need to convert from $$.Buffer/ArrayBuffer to String
				evaluatedAPICode[functionName].call(this, ...args, callback);
			}catch(err){
				return callback(createOpenDSUErrorWrapper(`Failed to  execute api.js code `, err));
			}
		}

		if(!evaluatedAPICode){
			archive.readFile("/code/api.js", function(err, apiCode){
				if(err){
					archive.readFile("/app/api.js", function(err, apiCode){
						if(err){
							return callback(createOpenDSUErrorWrapper(`Failed to  read file api.js in /code or /app`, err));
						} else {
							doEval(apiCode);
							execute();
						}
					});
				} else {
					doEval(apiCode);
					execute();
				}
			});
		} else {
			execute();
		}
	}
	return archive;
}

},{"overwrite-require":"overwrite-require"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIResolver.js":[function(require,module,exports){
/**
 * @param {BrickMapStrategyFactory} options.brickMapStrategyFactory
 * @param {DSUFactory} options.dsuFactory
 */
function KeySSIResolver(options) {
    options = options || {};
    const brickMapStrategyFactory = options.brickMapStrategyFactory;

    const dsuFactory = options.dsuFactory;


    ////////////////////////////////////////////////////////////
    // Public methods
    ////////////////////////////////////////////////////////////

    /**
     * @param {SeedSSI} dsuRepresentation
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn A function which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn A function which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.createDSU = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        dsuFactory.create(keySSI, options, callback);
    };

    /**
     * @param {string} keySSI
     * @param {object} options
     * @param {string} options.brickMapStrategy 'Diff', 'Versioned' or any strategy registered with the factory
     * @param {object} options.anchoringOptions Anchoring options to pass to bar map strategy
     * @param {callback} options.anchoringOptions.decisionFn A function which will decide when to effectively anchor changes
     *                                                              If empty, the changes will be anchored after each operation
     * @param {callback} options.anchoringOptions.conflictResolutionFn Callback which will handle anchoring conflicts
     *                                                              The default strategy is to reload the BrickMap and then apply the new changes
     * @param {callback} options.anchoringOptions.anchoringEventListener An event listener which is called when the strategy anchors the changes
     * @param {callback} options.anchoringOptions.signingFn  A function which will sign the new alias
     * @param {object} options.validationRules
     * @param {object} options.validationRules.preWrite An object capable of validating operations done in the "preWrite" stage of the BrickMap
     * @param {callback} callback
     */
    this.loadDSU = (keySSI, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!dsuFactory.isValidKeySSI(keySSI)) {
            let helpString;
            if(typeof keySSI === "string"){
                helpString = keySSI;
            } else {
                helpString = keySSI.getIdentifier(true);
            }
            return callback(new Error(`Invalid KeySSI: ${helpString}`));
        }
        dsuFactory.load(keySSI, options, callback);
    };

    /**
     * @return {DSUFactory}
     */
    this.getDSUFactory = () => {
        return dsuFactory;
    }

    /**
     * @return {BrickMapStrategyFactory}
     */
    this.getBrickMapStrategyFactory = () => {
        return brickMapStrategyFactory;
    }
}

module.exports = KeySSIResolver;

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ArraySSI.js":[function(require,module,exports){
function ArraySSI(identifier) {
    const SSITypes = require("../SSITypes");
    const KeySSIMixin = require("../KeySSIMixin");
    const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.ARRAY_SSI;
    }

    self.initialize = (dlDomain, arr, vn, hint) => {
        if (typeof vn === "undefined") {
            vn = 'v0';
        }
        const key = cryptoRegistry.getKeyDerivationFunction(self)(arr.join(''), 1000);
        self.load(SSITypes.ARRAY_SSI, dlDomain, cryptoRegistry.getEncodingFunction(self)(key), "", vn, hint);
    };

    self.derive = () => {
        const ConstSSI = require("./ConstSSI");
        const constSSI = ConstSSI.createConstSSI();
        constSSI.load(SSITypes.CONST_SSI, self.getDLDomain(), self.getSpecificString(), self.getControlString(), self.getVn(), self.getHint());
        return constSSI;
    };

    self.getEncryptionKey = () => {
        return self.derive().getEncryptionKey();
    };
}

function createArraySSI(identifier) {
    return new ArraySSI(identifier);
}

module.exports = {
    createArraySSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ConstSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ConstSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/CZaSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function CZaSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.CONSTANT_ZERO_ACCESS_SSI;
    }

    self.initialize = (dlDomain, hpk, vn, hint) => {
        self.load(SSITypes.CONSTANT_ZERO_ACCESS_SSI, dlDomain, '', hpk, vn, hint);
    };

    self.derive = () => {
        throw Error("Not implemented");
    };
}

function createCZaSSI(identifier) {
    return new CZaSSI(identifier);
}

module.exports = {
    createCZaSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ConstSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const CZaSSI = require("./CZaSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function ConstSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.CONST_SSI;
    }

    self.initialize = (dlDomain, constString, vn, hint) => {
        const key = cryptoRegistry.getKeyDerivationFunction(self)(constString, 1000);
        self.load(SSITypes.CONST_SSI, dlDomain, cryptoRegistry.getEncodingFunction(self)(key), "", vn, hint);
    };

    self.getEncryptionKey = () => {
        return cryptoRegistry.getDecodingFunction(self)(self.getSpecificString());
    };

    self.derive = () => {
        const cZaSSI = CZaSSI.createCZaSSI();
        const subtypeKey = cryptoRegistry.getHashFunction(self)(self.getEncryptionKey());
        cZaSSI.load(SSITypes.CONSTANT_ZERO_ACCESS_SSI, self.getDLDomain(), subtypeKey, self.getControlString(), self.getVn(), self.getHint());
        return cZaSSI;
    };
}

function createConstSSI(identifier) {
    return new ConstSSI(identifier);
}

module.exports = {
    createConstSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./CZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/CZaSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/PasswordSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const ConstSSI = require("./ConstSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function PasswordSSI(identifier){
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.initialize = (dlDomain, context, password, kdfOptions, vn, hint) => {
        const subtypeSpecificString = cryptoRegistry.getKeyDerivationFunction(self)(context + password, kdfOptions);
        self.load(SSITypes.PASSWORD_SSI, dlDomain, subtypeSpecificString, '', vn, hint);
    };

    self.derive = () => {
        const constSSI = ConstSSI.createConstSSI();
        constSSI.load(SSITypes.CONST_SSI, self.getDLDomain(), self.getSubtypeSpecificString(), self.getControlString(), self.getVn(), self.getHint());
        return constSSI;
    };

    self.getEncryptionKey = () => {
        return self.derive().getEncryptionKey();
    };
}

function createPasswordSSI(identifier) {
    return new PasswordSSI(identifier);
}

module.exports = {
    createPasswordSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ConstSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ConstSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ContractSSIs/ConsensusSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function ConsensusSSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.initialize = (dlDomain, contractName, vn, hint) => {
        self.load(SSITypes.CONSENSUS_SSI, dlDomain, contractName, undefined, vn, hint);
    };
}

function createConsensusSSI(identifier) {
    return new ConsensusSSI(identifier);
}

module.exports = {
    createConsensusSSI,
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/DSURepresentationNames.js":[function(require,module,exports){
const DSURepresentationNames = {
    "seed": "RawDossier"
}

module.exports = DSURepresentationNames;
},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/HashLinkSSIs/SignedHashLinkSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const { createHashLinkSSI } = require("../OtherKeySSIs/HashLinkSSI");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");
const SSITypes = require("../SSITypes");

function SignedHashLinkSSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.SIGNED_HASH_LINK_SSI;
    }

    self.initialize = (dlDomain, hashLink, timestamp, signature, vn, hint) => {
        self.load(SSITypes.SIGNED_HASH_LINK_SSI, dlDomain, hashLink, `${timestamp}/${signature.signature}/${signature.publicKey}`, vn, hint);
    };

    self.canBeVerified = () => {
        return true;
    };

    self.getHash = () => {
        const specificString = self.getSpecificString();
        if (typeof specificString !== "string") {
            console.trace("Specific string is not string", specificString.toString());
        }
        return specificString;
    };

    self.derive = () => {
        const hashLinkSSI = createHashLinkSSI();
        hashLinkSSI.load(SSITypes.HASH_LINK_SSI, self.getDLDomain(), self.getHash(), "", self.getVn(), self.getHint());
        return hashLinkSSI;
    };

    self.getTimestamp = function (){
        let control = self.getControlString();
        return control.split("/")[0];
    }

    self.getSignature = function (){
        let control = self.getControlString();
        let splitControl = control.split("/");
        let signature = splitControl[1];
        let publicKey = splitControl[2];
        return {signature, publicKey};
    }

    self.getPublicKeyHash = function () {
        const {publicKey} = self.getSignature();
        const decodedPublicKey = cryptoRegistry.getDecodingFunction(self)(publicKey);
        return cryptoRegistry.getHashFunction(self)(decodedPublicKey);
    };
}

function createSignedHashLinkSSI(identifier) {
    return new SignedHashLinkSSI(identifier);
}

module.exports = {
    createSignedHashLinkSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../OtherKeySSIs/HashLinkSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/HashLinkSSI.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIFactory.js":[function(require,module,exports){
const createSecretSSI = require("./SecretSSIs/SecretSSI").createSecretSSI;
const createAnchorSSI = require("./SecretSSIs/AnchorSSI").createAnchorSSI;
const createReadSSI = require("./SecretSSIs/ReadSSI").createReadSSI;
const createPublicSSI = require("./SecretSSIs/PublicSSI").createPublicSSI;
const createZaSSI = require("./SecretSSIs/ZaSSI").createZaSSI;
const createSeedSSI = require("./SeedSSIs/SeedSSI").createSeedSSI;
const createWalletSSI = require("./OtherKeySSIs/WalletSSI").createWalletSSI;
const createSReadSSI = require("./SeedSSIs/SReadSSI").createSReadSSI;
const createSZaSSI = require("./SeedSSIs/SZaSSI").createSZaSSI;
const createPasswordSSI = require("./ConstSSIs/PasswordSSI").createPasswordSSI;
const createArraySSI = require("./ConstSSIs/ArraySSI").createArraySSI;
const createConstSSI = require("./ConstSSIs/ConstSSI").createConstSSI;
const createCZaSSI = require("./ConstSSIs/CZaSSI").createCZaSSI;
const createHashLinkSSI = require("./OtherKeySSIs/HashLinkSSI").createHashLinkSSI;
const createSymmetricalEncryptionSSI = require("./OtherKeySSIs/SymmetricalEncryptionSSI").createSymmetricalEncryptionSSI;

const createTokenSSI = require("./TokenSSIs/TokenSSI").createTokenSSI;
const createOwnershipSSI = require("./OwnershipSSIs/OwnershipSSI").createOwnershipSSI;
const createOReadSSI = require("./OwnershipSSIs/OReadSSI").createOReadSSI;
const createZATSSI = require("./OwnershipSSIs/ZATSSI").createZATSSI;
const createTransferSSI = require("./TransferSSIs/TransferSSI").createTransferSSI;
const createSignedHashLinkSSI = require("./HashLinkSSIs/SignedHashLinkSSI").createSignedHashLinkSSI;

const createConsensusSSI = require("./ContractSSIs/ConsensusSSI").createConsensusSSI;
const createPublicKeySSI = require("./OtherKeySSIs/PublicKeySSI").createPublicKeySSI;

const SSITypes = require("./SSITypes");

const registry = {};

function KeySSIFactory() {
}

KeySSIFactory.prototype.registerFactory = (typeName, vn, derivedType, functionFactory) => {
    if (typeof derivedType === "function") {
        functionFactory = derivedType;
        derivedType = undefined;
    }

    if (typeof registry[typeName] !== "undefined") {
        throw Error(`A function factory for KeySSI of type ${typeName} is already registered.`);
    }

    registry[typeName] = {derivedType, functionFactory};
};

KeySSIFactory.prototype.create = (identifier, options) => {
    if (typeof identifier === "undefined") {
        throw Error("An SSI should be provided");
    }

    const KeySSIMixin = require("./KeySSIMixin");
    let keySSI = {}
    KeySSIMixin(keySSI);

    try{
        keySSI.autoLoad(identifier);
    }catch (e) {
        throw createOpenDSUErrorWrapper(`Invalid format for keySSI ${identifier}`, e);
    }

    const typeName = keySSI.getTypeName();

    return KeySSIFactory.prototype.createByType(typeName, identifier, options);
};

KeySSIFactory.prototype.createByType = (typeName, identifier, options) => {
    if (typeof identifier === "undefined") {
        throw Error("An SSI should be provided");
    }

    if (typeof registry[typeName] === "undefined") {
        throw Error(`The type ${typeName} is not a registered KeySSI type`);
    }
    const keySSI = registry[typeName].functionFactory(identifier);
    keySSI.options = options;
    return keySSI;
};

KeySSIFactory.prototype.createType = (typeName)=>{
    return registry[typeName].functionFactory();
}

KeySSIFactory.prototype.getRelatedType = (keySSI, otherType, callback) => {
    if (keySSI.getTypeName() === otherType) {
        return keySSI;
    }
    let currentEntry = registry[otherType];
    if (typeof currentEntry === "undefined") {
        return callback(Error(`${otherType} is not a registered KeySSI type.`))
    }

    while (typeof currentEntry.derivedType !== "undefined") {
        if (currentEntry.derivedType === keySSI.getTypeName()) {
            return $$.securityContext.getRelatedSSI(keySSI, otherType, callback);
        }
        currentEntry = registry[currentEntry.derivedType];
    }

    let derivedKeySSI;
    try {
        derivedKeySSI = getDerivedKeySSI(keySSI, otherType);
    } catch (err){
        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve derived type for keySSI`, err));
    }

    callback(undefined, derivedKeySSI);
};

KeySSIFactory.prototype.getAnchorType = (keySSI) => {
    let localKeySSI = keySSI;
    while (typeof registry[localKeySSI.getTypeName()].derivedType !== "undefined") {
        localKeySSI = localKeySSI.derive();
    }
    return localKeySSI;
};

KeySSIFactory.prototype.getRootKeySSITypeName = (keySSI) => {
    if (typeof keySSI === "object") {
        return KeySSIFactory.prototype.getRootKeySSITypeName(keySSI.getTypeName())
    }
    else if (typeof keySSI === "string") {
        let found = 0
        for (let parentKey in registry) {
            if (registry[parentKey].derivedType === keySSI) {
                found++
                return KeySSIFactory.prototype.getRootKeySSITypeName(parentKey)
            }
        }

        if (!found || found > 1) {
            return typeof keySSI === "object" ? keySSI.getTypeName() : keySSI
        }
    }
    else {
        return false
    }
}

const getDerivedKeySSI = (keySSI, derivedTypeName) => {
    let localKeySSI = keySSI;
    let currentEntry = registry[localKeySSI.getTypeName()];
    while (typeof currentEntry.derivedType !== "undefined") {
        if (currentEntry.derivedType === derivedTypeName) {
            return localKeySSI.derive();
        }
        localKeySSI = localKeySSI.derive();
        currentEntry = registry[currentEntry.derivedType];
    }

    throw Error(`${derivedTypeName} is not a valid KeySSI Type`);
};

KeySSIFactory.prototype.registerFactory(SSITypes.SECRET_SSI, 'v0', SSITypes.ANCHOR_SSI, createSecretSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.ANCHOR_SSI, 'v0', SSITypes.READ_SSI, createAnchorSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.READ_SSI, 'v0', SSITypes.PUBLIC_SSI, createReadSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.PUBLIC_SSI, 'v0', SSITypes.ZERO_ACCESS_SSI, createPublicSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.ZERO_ACCESS_SSI, 'v0', undefined, createZaSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.SEED_SSI, 'v0', SSITypes.SREAD_SSI, createSeedSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.WALLET_SSI, 'v0', SSITypes.CONST_SSI, createWalletSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.SREAD_SSI, 'v0', SSITypes.SZERO_ACCESS_SSI, createSReadSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.SZERO_ACCESS_SSI, 'v0', undefined, createSZaSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.PASSWORD_SSI, 'v0', SSITypes.CONST_SSI, createPasswordSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.ARRAY_SSI, 'v0', SSITypes.CONST_SSI, createArraySSI);
KeySSIFactory.prototype.registerFactory(SSITypes.CONST_SSI, 'v0', SSITypes.CONSTANT_ZERO_ACCESS_SSI, createConstSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.CONSTANT_ZERO_ACCESS_SSI, 'v0', undefined, createCZaSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.HASH_LINK_SSI, 'v0', undefined, createHashLinkSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, 'v0', undefined, createSymmetricalEncryptionSSI);

KeySSIFactory.prototype.registerFactory(SSITypes.TOKEN_SSI, 'v0', undefined, createTokenSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.OWNERSHIP_SSI, 'v0', SSITypes.OWNERSHIP_READ_SSI, createOwnershipSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.OWNERSHIP_READ_SSI, 'v0', SSITypes.ZERO_ACCESS_TOKEN_SSI, createOReadSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.ZERO_ACCESS_TOKEN_SSI, 'v0', undefined, createZATSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.TRANSFER_SSI, 'v0', undefined, createTransferSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.SIGNED_HASH_LINK_SSI, 'v0', SSITypes.HASH_LINK_SSI, createSignedHashLinkSSI);

KeySSIFactory.prototype.registerFactory(SSITypes.CONSENSUS_SSI, 'v0', undefined, createConsensusSSI);
KeySSIFactory.prototype.registerFactory(SSITypes.PUBLIC_KEY_SSI, 'v0', undefined, createPublicKeySSI);

module.exports = new KeySSIFactory();

},{"./ConstSSIs/ArraySSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ArraySSI.js","./ConstSSIs/CZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/CZaSSI.js","./ConstSSIs/ConstSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ConstSSI.js","./ConstSSIs/PasswordSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/PasswordSSI.js","./ContractSSIs/ConsensusSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ContractSSIs/ConsensusSSI.js","./HashLinkSSIs/SignedHashLinkSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/HashLinkSSIs/SignedHashLinkSSI.js","./KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","./OtherKeySSIs/HashLinkSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/HashLinkSSI.js","./OtherKeySSIs/PublicKeySSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/PublicKeySSI.js","./OtherKeySSIs/SymmetricalEncryptionSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/SymmetricalEncryptionSSI.js","./OtherKeySSIs/WalletSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/WalletSSI.js","./OwnershipSSIs/OReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/OReadSSI.js","./OwnershipSSIs/OwnershipSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/OwnershipSSI.js","./OwnershipSSIs/ZATSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/ZATSSI.js","./SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./SecretSSIs/AnchorSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/AnchorSSI.js","./SecretSSIs/PublicSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/PublicSSI.js","./SecretSSIs/ReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ReadSSI.js","./SecretSSIs/SecretSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/SecretSSI.js","./SecretSSIs/ZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ZaSSI.js","./SeedSSIs/SReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SReadSSI.js","./SeedSSIs/SZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SZaSSI.js","./SeedSSIs/SeedSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SeedSSI.js","./TokenSSIs/TokenSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/TokenSSIs/TokenSSI.js","./TransferSSIs/TransferSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/TransferSSIs/TransferSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js":[function(require,module,exports){
const cryptoRegistry = require("../CryptoAlgorithms/CryptoAlgorithmsRegistry");
const CryptoFunctionTypes = require("../CryptoAlgorithms/CryptoFunctionTypes");
const {BRICKS_DOMAIN_KEY} = require('opendsu').constants
const pskCrypto = require("pskcrypto");

const MAX_KEYSSI_LENGTH = 2048

function keySSIMixin(target) {
    let _prefix = "ssi";
    let _subtype;
    let _dlDomain;
    let _subtypeSpecificString;
    let _controlString;
    let _vn = "v0";
    let _hint;
    let _hintObject = {};
    let _dsa = false;
    let _securityContext = false;

    const _createHintObject = (hint = _hint) => {
        try {
            _hintObject = JSON.parse(hint)
        } catch (error) {
            //console.error('Parsing of hint failed, hint:', hint)
            _hintObject = {
                value: hint
            }
        }
    }

    const _inferJSON = (hintString) => {
        return hintString[0] === '{' || hintString[0] === '['
    }

    target.autoLoad = function (identifier) {
        if (typeof identifier === "undefined") {
            return;
        }

        if (typeof identifier !== "string") {
            throw new Error("The identifier should be string");
        }

        target.validateKeySSICharLength();

        let originalId = identifier;
        if (identifier.indexOf(":") === -1) {
            identifier = pskCrypto.pskBase58Decode(identifier).toString();
        }

        if (identifier.indexOf(":") === -1) {
            throw new Error(`Wrong format of SSI. ${originalId} ${identifier}`);
        }

        let segments = identifier.split(":");
        segments.shift();
        _subtype = segments.shift();
        _dlDomain = segments.shift();
        _subtypeSpecificString = segments.shift();
        _controlString = segments.shift();
        let version = segments.shift();
        if (version !== '') {
            _vn = version;
        }
        if (segments.length > 0) {
            _hint = segments.join(":");
            if (_inferJSON(_hint)) {
                _createHintObject(_hint);
            }
        }
        // _subtypeSpecificString = cryptoRegistry.getDecodingFunction(target)(_subtypeSpecificString);
    }

    target.validateKeySSICharLength = () => {
        if (target.getIdentifier() > MAX_KEYSSI_LENGTH) {
            throw new Error(`The identifier length exceed maximum char length ${MAX_KEYSSI_LENGTH}`);
        }
    }

    target.load = function (subtype, dlDomain, subtypeSpecificString, control, vn, hint) {
        _subtype = subtype;
        _dlDomain = dlDomain;
        _subtypeSpecificString = subtypeSpecificString;
        _controlString = control;
        _vn = vn || "v0";
        _hint = hint;

        target.validateKeySSICharLength();

        if (_hint) {
            _createHintObject(_hint)
        }
    }

    /**
     *
     * @param ssiType - string
     * @param callback - function
     */
    target.getRelatedType = function (ssiType, callback) {
        const KeySSIFactory = require("./KeySSIFactory");
        KeySSIFactory.getRelatedType(target, ssiType, callback);
    }

    target.getRootKeySSITypeName = function () {
        const KeySSIFactory = require("./KeySSIFactory");
        return KeySSIFactory.getRootKeySSITypeName(target);
    }

    target.getAnchorId = function () {
        const keySSIFactory = require("./KeySSIFactory");
        return keySSIFactory.getAnchorType(target).getNoHintIdentifier();
    }

    target.getSpecificString = function () {
        return _subtypeSpecificString;
    }

    target.getName = function () {
        console.trace("Obsolete function. Replace with getTypeName");
        return _subtype;
    }

    target.getTypeName = function () {
        return _subtype;
    }

    target.getDLDomain = function () {
        return _dlDomain;
    }

    target.getControlString = function () {
        return _controlString;
    }

    target.getHint = function () {
        return _hint;
    }

    target.getVn = function () {
        return _vn;
    }

    target.getDSURepresentationName = function () {
        const DSURepresentationNames = require("./DSURepresentationNames");
        return DSURepresentationNames[_subtype];
    }

    target.getNoHintIdentifier = function (plain) {
        let identifier = `${_prefix}:${target.getTypeName()}:${_dlDomain}:${_subtypeSpecificString}:${_controlString}:${_vn}`;
        return plain ? identifier : pskCrypto.pskBase58Encode(identifier);
    }

    target.getIdentifier = function (plain) {
        let id = target.getNoHintIdentifier(true);

        if (typeof _hint !== "undefined") {
            id += ":" + _hint;
        }

        return plain ? id : pskCrypto.pskBase58Encode(id);
    }

    target.getBricksDomain = function () {
        return _hintObject[BRICKS_DOMAIN_KEY] ? _hintObject[BRICKS_DOMAIN_KEY] : _dlDomain;
    }

    target.clone = function () {
        let clone = {};
        clone.prototype = target.prototype;
        for (let attr in target) {
            if (target.hasOwnProperty(attr)) {
                clone[attr] = target[attr];
            }
        }
        keySSIMixin(clone);
        return clone;
    }

    target.cast = function (newType) {
        target.getTypeName = () => {
            return newType;
        };
        target.load(newType, _dlDomain, _subtypeSpecificString, _controlString, _vn, _hint);
    }

    target.canSign = () => {
        return _dsa
    }

    target.setCanSign = (dsa) => {
        _dsa = dsa
    }

    target.canBeVerified = () => {
        return false;
    };

    target.sign = (dataToSign, callback) => {
        const sc = require("opendsu").loadAPI("sc").getSecurityContext();
        sc.sign(target, dataToSign, callback);
    };

    target.verify = (data, digitalProof) => {
        if (typeof digitalProof === "string") {
            try {
                digitalProof = JSON.parse(digitalProof);
            } catch (e) {
                throw createOpenDSUErrorWrapper("Failed to parse string signature", e);
            }
        }
        const convertPublicKey = cryptoRegistry.getConvertPublicKeyFunction(target);
        const decode = cryptoRegistry.getDecodingFunction(target);
        const decodedPublicKey = decode(digitalProof.publicKey);

        const pemPublicKey = convertPublicKey(decodedPublicKey);
        const signature = decode(digitalProof.signature);
        const verify = cryptoRegistry.getVerifyFunction(target);

        return verify(data, pemPublicKey, signature);
    };

    target.toJSON = function () {
        return target.getIdentifier();
    }
}

module.exports = keySSIMixin;

},{"../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../CryptoAlgorithms/CryptoFunctionTypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoFunctionTypes.js","./DSURepresentationNames":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/DSURepresentationNames.js","./KeySSIFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIFactory.js","opendsu":"opendsu","pskcrypto":"pskcrypto"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/HashLinkSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function HashLinkSSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.HASH_LINK_SSI;
    }

    self.initialize = (dlDomain, hash, vn, hint) => {
        self.load(SSITypes.HASH_LINK_SSI, dlDomain, hash, '', vn, hint);
    };

    self.getHash = () => {
        const specificString = self.getSpecificString();
        if (typeof specificString !== "string") {
            console.trace("Specific string is not string", specificString.toString());
        }
        return specificString;
    };

    self.derive = () => {
        throw Error("Not implemented");
    };
}

function createHashLinkSSI(identifier) {
    return new HashLinkSSI(identifier);
}

module.exports = {
    createHashLinkSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/PublicKeySSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function PublicKeySSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.PUBLIC_KEY_SSI;
    }

    self.initialize = (compatibleFamilyName, publicKey, vn) => {
        publicKey = cryptoRegistry.getEncodingFunction(self)(publicKey);
        self.load(SSITypes.PUBLIC_KEY_SSI, '', compatibleFamilyName, publicKey, vn);
    };

    self.getPublicKey = (format) => {
        let publicKey = cryptoRegistry.getDecodingFunction(self)(self.getControlString());
        if (format !== "raw") {
            publicKey = cryptoRegistry.getConvertPublicKeyFunction(self)(publicKey, {outputFormat: format});
        }

        return publicKey;
    };

    self.generateCompatiblePowerfulKeySSI = (callback) => {
        const keySSIFactory = require("../KeySSIFactory");
        const powerfulSSI = keySSIFactory.createType(self.getSpecificString());
        powerfulSSI.initialize(self.getDLDomain(), undefined, undefined, self.getVn(), callback);
    }
    self.derive = () => {
        throw Error("Not implemented");
    };
}

function createPublicKeySSI(identifier) {
    return new PublicKeySSI(identifier);
}

module.exports = {
    createPublicKeySSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIFactory.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/SymmetricalEncryptionSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function SymmetricalEncryptionSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = () => {
        return SSITypes.SYMMETRICAL_ENCRYPTION_SSI;
    };

    let load = self.load;
    self.load = function (subtype, dlDomain, encryptionKey, control, vn, hint){
        if (typeof encryptionKey === "undefined") {
            encryptionKey = cryptoRegistry.getEncryptionKeyGenerationFunction(self)();
        }

        if ($$.Buffer.isBuffer(encryptionKey)) {
            encryptionKey = cryptoRegistry.getEncodingFunction(self)(encryptionKey);
        }

        load(subtype, dlDomain, encryptionKey, '', vn, hint);
    }

    self.getEncryptionKey = function() {
        return cryptoRegistry.getDecodingFunction(self)(self.getSpecificString());
    };

    self.derive = function (){
        throw Error("Not implemented");
    }
}

function createSymmetricalEncryptionSSI(identifier) {
    return new SymmetricalEncryptionSSI(identifier);
}

module.exports = {
    createSymmetricalEncryptionSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OtherKeySSIs/WalletSSI.js":[function(require,module,exports){
const SeedSSI = require("./../SeedSSIs/SeedSSI");
const ArraySSI = require("./../ConstSSIs/ArraySSI");
const SSITypes = require("../SSITypes");

function WalletSSI(identifier) {
    const self = this;
    const arraySSI = ArraySSI.createArraySSI(identifier);

    arraySSI.getTypeName = () => {
        return SSITypes.WALLET_SSI;
    };

    Object.assign(self, arraySSI);

}

function createWalletSSI(identifier) {
    return new WalletSSI(identifier);
}

module.exports = {
    createWalletSSI
}

},{"../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./../ConstSSIs/ArraySSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/ConstSSIs/ArraySSI.js","./../SeedSSIs/SeedSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SeedSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/OReadSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const ZATSSI = require("./ZATSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function OReadSSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.OWNERSHIP_READ_SSI;
    }

    self.initialize = (dlDomain, hashPrivateKey, hashPublicKeyLevelAndToken, vn, hint) => {
        self.load(SSITypes.OWNERSHIP_READ_SSI, dlDomain, hashPrivateKey, hashPublicKeyLevelAndToken, vn, hint);
    };

    self.derive = () => {
        const zatSSI = ZATSSI.createZATSSI();
        const token = self.getToken();
        const hashPublicKey = self.getHashPublicKey();
        zatSSI.load(
            SSITypes.ZERO_ACCESS_TOKEN_SSI,
            self.getDLDomain(),
            token,
            hashPublicKey,
            self.getVn(),
            self.getHint()
        );
        return zatSSI;
    };

    self.getEncryptionKey = () => {
        return cryptoRegistry.getDecodingFunction(self)(self.getHashPublicKey());
    };

    const getControlParts = function () {
        let control = self.getControlString();
        if (control == null) {
            throw Error("Operation requested on an invalid OwnershipSSI. Initialise first");
        }
        return control.split("/");
    };

    self.getHashPublicKey = function () {
        let token = getControlParts()[0];
        return token;
    };

    self.getLevel = function () {
        let level = getControlParts()[1];
        return level;
    };

    self.getToken = function () {
        let token = getControlParts()[2];
        return token;
    };
}

function createOReadSSI(identifier) {
    return new OReadSSI(identifier);
}

module.exports = {
    createOReadSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ZATSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/ZATSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/OwnershipSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const OReadSSI = require("./OReadSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function OwnershipSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.OWNERSHIP_SSI;
    }

    self.setCanSign(true);

    self.initialize = function (dlDomain, privateKey, levelAndToken, vn, hint, callback) {
        if (typeof privateKey === "function") {
            callback = privateKey;
            privateKey = undefined;
        }
        if (typeof levelAndToken === "function") {
            callback = levelAndToken;
            levelAndToken = undefined;
        }
        if (typeof vn === "function") {
            callback = vn;
            vn = "v0";
        }
        if (typeof hint === "function") {
            callback = hint;
            hint = undefined;
        }

        if (typeof privateKey === "undefined") {
            cryptoRegistry
                .getKeyPairGenerator(self)()
                .generateKeyPair((err, publicKey, privateKey) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(
                            createOpenDSUErrorWrapper(`Failed generate private/public key pair`, err)
                        );
                    }
                    privateKey = cryptoRegistry.getEncodingFunction(self)(privateKey);
                    self.load(SSITypes.OWNERSHIP_SSI, dlDomain, privateKey, levelAndToken, vn, hint);
                    if (callback) {
                        callback(undefined, self);
                    }
                });
        } else {
            self.load(SSITypes.OWNERSHIP_SSI, dlDomain, privateKey, levelAndToken, vn, hint);
            if (callback) {
                callback(undefined, self);
            }
        }
        self.initialize = function () {
            throw Error("KeySSI already initialized");
        };
    };

    self.derive = function () {
        const oReadSSI = OReadSSI.createOReadSSI();
        const privateKey = self.getPrivateKey();
        const publicKey = cryptoRegistry.getDerivePublicKeyFunction(self)(privateKey, "raw");
        const publicKeyHash = cryptoRegistry.getHashFunction(self)(publicKey);
        const levelAndToken = self.getControlString();

        const oReadSpecificString = cryptoRegistry.getHashFunction(self)(privateKey);
        const oReadControl = `${publicKeyHash}/${levelAndToken}`;
        oReadSSI.load(
            SSITypes.OWNERSHIP_READ_SSI,
            self.getDLDomain(),
            oReadSpecificString,
            oReadControl,
            self.getVn(),
            self.getHint()
        );
        return oReadSSI;
    };

    self.getPrivateKey = function (format) {
        let validSpecificString = self.getSpecificString();
        if (validSpecificString === undefined) {
            throw Error("Operation requested on an invalid OwnershipSSI. Initialise first");
        }
        let privateKey = validSpecificString;
        if (typeof privateKey === "string") {
            privateKey = cryptoRegistry.getDecodingFunction(self)(privateKey);
        }
        if (format === "pem") {
            const pemKeys = cryptoRegistry.getKeyPairGenerator(self)().getPemKeys(privateKey, self.getPublicKey("raw"));
            privateKey = pemKeys.privateKey;
        }
        return privateKey;
    };

    self.sign = function (dataToSign, callback) {
        const privateKey = self.getPrivateKey();
        const sign = cryptoRegistry.getSignFunction(self);
        const encode = cryptoRegistry.getEncodingFunction(self);
        const digitalProof = {};
        digitalProof.signature = encode(sign(dataToSign, privateKey));
        digitalProof.publicKey = encode(self.getPublicKey("raw"));

        callback(undefined, digitalProof);
    }


    self.getPrivateKeyHash = function () {
        return cryptoRegistry.getHashFunction(self)(self.getPrivateKey());
    };

    self.getPublicKey = function (format) {
        return cryptoRegistry.getDerivePublicKeyFunction(self)(self.getPrivateKey(), format);
    };

    self.getPublicKeyHash = function () {
        // const publicKey = cryptoRegistry.getDerivePublicKeyFunction(self)(self.getPrivateKey(), "raw");
        const publicKey = self.getPublicKey("raw");
        const publicKeyHash = cryptoRegistry.getHashFunction(self)(publicKey);
        return publicKeyHash;
    };

    self.getEncryptionKey = function () {
        return self.derive().getEncryptionKey();
    };

    const getControlParts = function () {
        let control = self.getControlString();
        if (control == null) {
            throw Error("Operation requested on an invalid OwnershipSSI. Initialise first");
        }
        return control.split("/");
    };

    self.getLevel = function () {
        let level = getControlParts()[0];
        return level;
    };

    self.getToken = function () {
        let token = getControlParts()[1];
        return token;
    };

    self.getAnchorId = function () {
        return self.getToken();
    };
}

function createOwnershipSSI(identifier) {
    return new OwnershipSSI(identifier);
}

module.exports = {
    createOwnershipSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./OReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/OReadSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/OwnershipSSIs/ZATSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function ZATSSI(identifier) {
    const self = this;
    KeySSIMixin(self);

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.ZERO_ACCESS_TOKEN_SSI;
    }

    self.initialize = (dlDomain, token, hashInitialOwnerPublicKey, vn, hint) => {
        self.load(SSITypes.ZERO_ACCESS_TOKEN_SSI, dlDomain, token, hashInitialOwnerPublicKey, vn, hint);
    };

    self.derive = () => {
        throw Error("Not implemented");
    };
}

function createZATSSI(identifier) {
    return new ZATSSI(identifier);
}

module.exports = {
    createZATSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js":[function(require,module,exports){
module.exports = {
    DEFAULT: "default",
    SECRET_SSI: "secret",
    ANCHOR_SSI: "anchor",
    READ_SSI: "read",
    PUBLIC_SSI: "public",
    ZERO_ACCESS_SSI: "za",
    SEED_SSI: "seed",
    SREAD_SSI: "sread",
    SZERO_ACCESS_SSI: "sza",
    PASSWORD_SSI: "pass",
    CONST_SSI: "const",
    CONSTANT_ZERO_ACCESS_SSI: "cza",
    ARRAY_SSI: "array",
    HASH_LINK_SSI: "hl",
    WALLET_SSI: "wallet",
    SYMMETRICAL_ENCRYPTION_SSI: "se",
    TOKEN_SSI: "token",
    OWNERSHIP_SSI: "own",
    OWNERSHIP_READ_SSI: "oread",
    ZERO_ACCESS_TOKEN_SSI: "zat",
    TRANSFER_SSI: "transfer",
    SIGNED_HASH_LINK_SSI: "shl",
    CONSENSUS_SSI: "consensus",
    PUBLIC_KEY_SSI: "pk"
};

},{}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/AnchorSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const ReadSSI = require("./ReadSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function AnchorSSI(identifier) {
    KeySSIMixin(this);

    if (typeof identifier !== "undefined") {
        this.autoLoad(identifier);
    }

    this.derive = () => {
        const readSSI = ReadSSI.createReadSSI();
        const subtypeKey = cryptoRegistry.getHashFunction(this)(this.getEncryptionKey());
        readSSI.load(SSITypes.READ_SSI, this.getDLDomain(), subtypeKey, this.getControlString(), this.getVn(), this.getHint());
        return readSSI;
    };
}

function createAnchorSSI(identifier) {
    return new AnchorSSI(identifier);
}

module.exports = {
    createAnchorSSI
}

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ReadSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/PublicSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const ZaSSI = require("./ZaSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function PublicSSI(identifier) {
    KeySSIMixin(this);

    if (typeof identifier !== "undefined") {
        this.autoLoad(identifier);
    }

    this.derive = () => {
        const zaSSI = ZaSSI.createZaSSI();
        const subtypeKey = cryptoRegistry.getHashFunction(this)(this.getEncryptionKey())
        zaSSI.initialize(SSITypes.ZERO_ACCESS_SSI, this.getDLDomain(), subtypeKey, this.getControlString(), this.getVn(), this.getHint());
        return zaSSI;
    };
}

function createPublicSSI(identifier) {
    return new PublicSSI(identifier);
}

module.exports = {
    createPublicSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./ZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ZaSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ReadSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const PublicSSI = require("./PublicSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function ReadSSI(identifier) {
    KeySSIMixin(this);

    if (typeof identifier !== "undefined") {
        this.load(identifier);
    }

    this.derive = () => {
        const publicSSI = PublicSSI.createPublicSSI();
        const subtypeKey = cryptoRegistry.getHashFunction(this)(this.getEncryptionKey());
        publicSSI.load(SSITypes.PUBLIC_SSI, this.getDLDomain(), subtypeKey, this.getControlString(), this.getVn(), this.getHint());
        return publicSSI;
    };
}

function createReadSSI(identifier) {
    return new ReadSSI(identifier);
}

module.exports = {
    createReadSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./PublicSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/PublicSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/SecretSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const AnchorSSI = require("./AnchorSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function SecretSSI(identifier) {
    KeySSIMixin(this);

    if (typeof identifier !== "undefined") {
        this.autoLoad(identifier);
    }

    this.derive = () => {
        const anchorSSI = AnchorSSI.createAnchorSSI();
        const subtypeKey = cryptoRegistry.getHashFunction(this)(this.getEncryptionKey())
        anchorSSI.load(SSITypes.ANCHOR_SSI, this.getDLDomain(), subtypeKey, this.getControlString(), this.getVn(), this.getHint());
        return anchorSSI;
    };
}

function createSecretSSI (identifier){
    return new SecretSSI(identifier);
}
module.exports = {
    createSecretSSI
}

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./AnchorSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/AnchorSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SecretSSIs/ZaSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
function ZaSSI(identifier) {
    KeySSIMixin(this);

    if (typeof identifier !== "undefined") {
        this.autoLoad(identifier);
    }

    this.derive = () => {
        throw Error("Not implemented");
    };
}

function createZaSSI(identifier) {
    return new ZaSSI(identifier);
}

module.exports = {
    createZaSSI
};
},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SReadSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SZaSSI = require("./SZaSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function SReadSSI(identifier) {
    KeySSIMixin(this);
    const self = this;

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.SREAD_SSI;
    }

    self.initialize = (dlDomain, vn, hint) => {
        self.load(SSITypes.SREAD_SSI, dlDomain, "", undefined, vn, hint);
    };

    self.derive = () => {
        const sZaSSI = SZaSSI.createSZaSSI();
        const subtypeKey = '';
        const subtypeControl = self.getControlString();
        sZaSSI.load(SSITypes.SZERO_ACCESS_SSI, self.getDLDomain(), subtypeKey, subtypeControl, self.getVn(), self.getHint());
        return sZaSSI;
    };

    self.getEncryptionKey = () => {
        return cryptoRegistry.getDecodingFunction(self)(self.getControlString());
    };
}

function createSReadSSI(identifier) {
    return new SReadSSI(identifier)
}

module.exports = {
    createSReadSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./SZaSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SZaSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SZaSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function SZaSSI(identifier) {
    const self = this;
    KeySSIMixin(self);

    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.SZERO_ACCESS_SSI;
    }

    self.initialize = (dlDomain, hpk, vn, hint) => {
        self.load(SSITypes.SZERO_ACCESS_SSI, dlDomain, '', hpk, vn, hint);
    };

    self.derive = () => {
        throw Error("Not implemented");
    };
}

function createSZaSSI(identifier) {
    return new SZaSSI(identifier);
}

module.exports = {
    createSZaSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SeedSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SReadSSI = require("./SReadSSI");
const SSITypes = require("../SSITypes");
const cryptoRegistry = require("../../CryptoAlgorithms/CryptoAlgorithmsRegistry");

function SeedSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.SEED_SSI;
    }

    self.setCanSign(true);

    self.initialize = function (dlDomain, privateKey, control, vn, hint, callback) {
        if (typeof privateKey === "function") {
            callback = privateKey;
            privateKey = undefined;
        }
        if (typeof control === "function") {
            callback = control;
            control = undefined;
        }
        if (typeof vn === "function") {
            callback = vn;
            vn = 'v0';
        }
        if (typeof hint === "function") {
            callback = hint;
            hint = undefined;
        }

        if (typeof privateKey === "undefined") {
            cryptoRegistry.getKeyPairGenerator(self)().generateKeyPair((err, publicKey, privateKey) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed generate private/public key pair`, err));
                }
                privateKey = cryptoRegistry.getEncodingFunction(self)(privateKey);
                self.load(SSITypes.SEED_SSI, dlDomain, privateKey, '', vn, hint);
                if (callback) {
                    callback(undefined, self);
                }
            });
        } else {
            privateKey = cryptoRegistry.getEncodingFunction(self)(privateKey);
            self.load(SSITypes.SEED_SSI, dlDomain, privateKey, '', vn, hint);
            if (callback) {
                callback(undefined, self);
            }
        }
        self.initialize = function () {
            throw Error("KeySSI already initialized");
        }
    };

    self.derive = function () {
        const sReadSSI = SReadSSI.createSReadSSI();
        const privateKey = self.getPrivateKey();
        const sreadSpecificString = cryptoRegistry.getHashFunction(self)(privateKey);
        const publicKey = cryptoRegistry.getDerivePublicKeyFunction(self)(privateKey, "raw");
        const subtypeControl = cryptoRegistry.getHashFunction(self)(publicKey);
        sReadSSI.load(SSITypes.SREAD_SSI, self.getDLDomain(), sreadSpecificString, subtypeControl, self.getVn(), self.getHint());
        return sReadSSI;
    };

    self.getPrivateKey = function (format) {
        let validSpecificString = self.getSpecificString();
        if (validSpecificString === undefined) {
            throw Error("Operation requested on an invalid SeedSSI. Initialise first")
        }
        let privateKey = cryptoRegistry.getDecodingFunction(self)(validSpecificString);
        if (format === "pem") {
            const pemKeys = cryptoRegistry.getKeyPairGenerator(self)().getPemKeys(privateKey, self.getPublicKey("raw"));
            privateKey = pemKeys.privateKey;
        }
        return privateKey;
    }

    self.sign = function (dataToSign, callback) {
        const privateKey = self.getPrivateKey();
        const sign = cryptoRegistry.getSignFunction(self);
        const encode = cryptoRegistry.getEncodingFunction(self);
        const digitalProof = {};
        digitalProof.signature = encode(sign(dataToSign, privateKey));
        digitalProof.publicKey = encode(self.getPublicKey("raw"));

        callback(undefined, digitalProof);
    }

    self.getPublicKey = function (format) {
        return cryptoRegistry.getDerivePublicKeyFunction(self)(self.getPrivateKey(), format);
    }

    self.getEncryptionKey = function () {
        return self.derive().getEncryptionKey();
    };

    self.getKeyPair = function (){
        const keyPair = {
            privateKey: self.getPrivateKey("pem"),
            publicKey: self.getPublicKey("pem")
        }

        return keyPair;
    }
}

function createSeedSSI(identifier) {
    return new SeedSSI(identifier);
}

module.exports = {
    createSeedSSI
};

},{"../../CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","./SReadSSI":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SeedSSIs/SReadSSI.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/TokenSSIs/TokenSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function TokenSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.TOKEN_SSI;
    }

    self.initialize = function (dlDomain, amount, hashInitialOwnerPublicKey, vn, hint, callback) {
        if (typeof amount === "function") {
            callback = amount;
            amount = undefined;
        }
        if (typeof hashInitialOwnerPublicKey === "function") {
            callback = hashInitialOwnerPublicKey;
            hashInitialOwnerPublicKey = undefined;
        }
        if (typeof vn === "function") {
            callback = vn;
            vn = "v0";
        }
        if (typeof hint === "function") {
            callback = hint;
            hint = undefined;
        }

        self.load(SSITypes.TOKEN_SSI, dlDomain, amount, hashInitialOwnerPublicKey, vn, hint);
        if (callback) {
            callback(undefined, self);
        }

        self.initialize = function () {
            throw Error("KeySSI already initialized");
        };
    };

    self.takeOwnership = function (ownershipSSI, callback) {
        // will give token ownership to another generated ownershipSSI
        throw Error("Not implemented");
        // callback(err, newOwnershipSSI);
    };

    self.giveOwnership = function (ownershipSSI, oReadSSI, callback) {
        // will give token ownership to another specified oReadSSI
        throw Error("Not implemented");
        // callback(err, transferSSI);
    };
}

function createTokenSSI(identifier) {
    return new TokenSSI(identifier);
}

module.exports = {
    createTokenSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/TransferSSIs/TransferSSI.js":[function(require,module,exports){
const KeySSIMixin = require("../KeySSIMixin");
const SSITypes = require("../SSITypes");

function TransferSSI(identifier) {
    KeySSIMixin(this);
    const self = this;
    if (typeof identifier !== "undefined") {
        self.autoLoad(identifier);
    }

    self.getTypeName = function () {
        return SSITypes.TRANSFER_SSI;
    }

    self.initialize = function (dlDomain, hashNewPublicKey, timestamp, signature, vn, hint, callback) {
        if (typeof vn === "function") {
            callback = vn;
            vn = "v0";
        }
        if (typeof hint === "function") {
            callback = hint;
            hint = undefined;
        }

        self.load(SSITypes.TRANSFER_SSI, dlDomain, hashNewPublicKey, `${timestamp}/${signature.signature}/${signature.publicKey}`, vn, hint);

        if (callback) {
            callback(undefined, self);
        }

        self.initialize = function () {
            throw Error("KeySSI already initialized");
        };
    };

    self.getPublicKeyHash = function () {
        return self.getSpecificString();
    };

    self.getTimestamp = function (){
        let control = self.getControlString();
        return control.split("/")[0];
    }

    self.getSignature = function (){
        let control = self.getControlString();
        let splitControl = control.split("/");
        let signature = splitControl[1];
        let publicKey = splitControl[2];
        return {signature, publicKey};
    }
}

function createTransferSSI(identifier) {
    return new TransferSSI(identifier);
}

module.exports = {
    createTransferSSI
};

},{"../KeySSIMixin":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIMixin.js","../SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/anchoring-utils.js":[function(require,module,exports){
const constants = require("../moduleConstants");

function validateHashLinks(keySSI, hashLinks, callback) {
    const validatedHashLinks = [];
    let lastSSI;
    let lastTransferSSI;
    for (let i = 0; i < hashLinks.length; i++) {
        const newSSI = hashLinks[i];
        if (!verifySignature(keySSI, newSSI, lastSSI)) {
            return callback(Error("Failed to verify signature"));
        }

        if (!validateAnchoredSSI(lastTransferSSI, newSSI)) {
            return callback(Error("Failed to validate SSIs"));
        }

        if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
            lastTransferSSI = newSSI;
        } else {
            validatedHashLinks.push(newSSI);
            lastSSI = newSSI;
        }
    }
    callback(undefined, validatedHashLinks);
}


function validateAnchoredSSI(lastTransferSSI, currentSSI) {
    if (!lastTransferSSI) {
        return true;
    }
    if (lastTransferSSI.getPublicKeyHash() !== currentSSI.getPublicKeyHash()) {
        return false;
    }

    return true;
}

function verifySignature(keySSI, newSSI, lastSSI) {
    if (!keySSI.canSign()) {
        return true;
    }
    if (!newSSI.canBeVerified()) {
        return true;
    }
    const timestamp = newSSI.getTimestamp();
    const signature = newSSI.getSignature();
    let dataToVerify = timestamp;
    if (lastSSI) {
        dataToVerify = lastSSI.getIdentifier() + dataToVerify;
    }

    if (newSSI.getTypeName() === constants.KEY_SSIS.SIGNED_HASH_LINK_SSI) {
        dataToVerify += keySSI.getAnchorId();
        return keySSI.verify(dataToVerify, signature)
    }
    if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
        dataToVerify += newSSI.getSpecificString();
        return keySSI.verify(dataToVerify, signature);
    }

    return false;
}

module.exports = {
    validateHashLinks,
};

},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/cachedAnchoring.js":[function(require,module,exports){
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/");
const storeName = "anchors";

function addVersion(anchorId, newHashLinkId, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }

        // when the anchor is first created, no version is created yet
        if(newHashLinkId) {
            hashLinkIds.push(newHashLinkId);
        }
        cache.put(anchorId, hashLinkIds, callback);
    });
}

function versions(anchorId, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }
        const hashLinkSSIs = hashLinkIds.map(hashLinkId => keySSISpace.parse(hashLinkId));
        return callback(undefined, hashLinkSSIs);
    });
}

module.exports = {
    addVersion,
    versions
}
},{"../cache/":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/index.js":[function(require,module,exports){
const bdns = require("../bdns");
const keyssi = require("../keyssi");
const crypto = require("../crypto");
const {fetch, doPut} = require("../http");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");
const cachedAnchoring = require("./cachedAnchoring");
const config = require("../config");
const {validateHashLinks} = require("./anchoring-utils");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}
/**
 * Get versions
 * @param {keySSI} keySSI
 * @param {string} authToken
 * @param {function} callback
 */
const versions = (keySSI, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    const dlDomain = keySSI.getDLDomain();
    const anchorId = keySSI.getAnchorId();

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedAnchoring.versions(anchorId, callback);
    }


    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        //TODO: security issue (which response we trust)
        const fetchAnchor = (service) => {
            return fetch(`${service}/anchor/${dlDomain}/get-all-versions/${anchorId}`)
                .then((response) => {
                    return response.json().then(async(hlStrings) => {
                        const hashLinks = hlStrings.map((hlString) => {
                            return keyssi.parse(hlString);
                        });

                        const validatedHashLinks = await $$.promisify(validateHashLinks)(keySSI, hashLinks);

                        // cache.put(anchorId, hlStrings);
                        return validatedHashLinks;
                    });
                });
        };

        promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
    });
};

/**
 * Add new version
 * @param {keySSI} SSICapableOfSigning
 * @param {hashLinkSSI} newSSI
 * @param {hashLinkSSI} lastSSI
 * @param {string} zkpValue
 * @param {string} digitalProof
 * @param {function} callback
 */
const addVersion = (SSICapableOfSigning, newSSI, lastSSI, zkpValue, callback) => {
    if (typeof newSSI === "function") {
        callback = newSSI;
        newSSI = undefined;
        lastSSI = undefined;
        zkpValue = '';
    }

    if (typeof lastSSI === "function") {
        callback = lastSSI;
        lastSSI = undefined;
        zkpValue = '';
    }

    if (typeof zkpValue === "function") {
        callback = zkpValue;
        zkpValue = '';
    }

    const dlDomain = SSICapableOfSigning.getDLDomain();
    const anchorId = SSICapableOfSigning.getAnchorId();

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedAnchoring.addVersion(anchorId, newSSI ? newSSI.getIdentifier() : undefined, callback);
    }

    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const hashLinkIds = {
            last: lastSSI ? lastSSI.getIdentifier() : null,
            new: newSSI ? newSSI.getIdentifier(): null
        };

        createDigitalProof(SSICapableOfSigning, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
            const body = {
                hashLinkIds,
                digitalProof,
                zkp: zkpValue
            };

            const addAnchor = (service) => {
                return new Promise((resolve, reject) => {
                    const anchorAction = newSSI ? "append-to-anchor" : "create-anchor";
                    const putResult = doPut(`${service}/anchor/${dlDomain}/${anchorAction}/${anchorId}`, JSON.stringify(body), (err, data) => {
                        if (err) {
                            return reject({
                                statusCode: err.statusCode,
                                message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                            });
                        }

                        require("opendsu").loadApi("resolver").invalidateDSUCache(SSICapableOfSigning);
                        return resolve(data);
                    });
                    if (putResult) {
                        putResult.then(resolve).catch(reject);
                    }
                })
            };

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback, new Error("Storing a brick"));
        });
    });
};

function createDigitalProof(SSICapableOfSigning, newSSIIdentifier, lastSSIIdentifier, zkp, callback) {
     // when the anchor is first created, no version is created yet
    if(!newSSIIdentifier) {
        newSSIIdentifier = "";
    }

    let anchorId = SSICapableOfSigning.getAnchorId();
    let dataToSign = anchorId + newSSIIdentifier + zkp;
    if (lastSSIIdentifier) {
        dataToSign += lastSSIIdentifier;
    }

    if (SSICapableOfSigning.canSign() === true) {
        return SSICapableOfSigning.sign(dataToSign, callback);
    }

    callback(undefined, {signature: "", publicKey: ""});
}

const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}


const callContractMethod = (domain, method, ...args) => {
    const callback = args.pop();
    const contracts = require("opendsu").loadApi("contracts");
    contracts.callContractMethod(domain, "anchoring", method, args, callback);
}

const createAnchor = (dsuKeySSI, callback) => {
    addVersion(dsuKeySSI, callback)
}

const createNFT = (nftKeySSI, callback) => {
    addVersion(nftKeySSI, callback)
}

const appendToAnchor = (dsuKeySSI, newShlSSI, previousShlSSI, zkpValue, callback) => {
    addVersion(dsuKeySSI, newShlSSI, previousShlSSI, zkpValue, callback)
}

const transferTokenOwnership = (nftKeySSI, ownershipSSI, callback) => {
    // TODO: to be implemented
    callContractMethod(domain, "transferTokenOwnership", ...args);
}

const getAllVersions = (keySSI, authToken, callback) => {
    versions(keySSI, authToken, callback);
}

const getLatestVersion = (domain, ...args) => {
    // TODO: to be implemented
    callContractMethod(domain, "getLatestVersion", ...args);
}

module.exports = {
    createAnchor,
    createNFT,
    appendToAnchor,
    transferTokenOwnership,
    getAllVersions,
    getLatestVersion
}

},{"../bdns":"/home/runner/work/privatesky/privatesky/modules/opendsu/bdns/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/index.js","../http":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js","../keyssi":"/home/runner/work/privatesky/privatesky/modules/opendsu/keyssi/index.js","../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/promise-runner":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/promise-runner.js","./anchoring-utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/anchoring-utils.js","./cachedAnchoring":"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/cachedAnchoring.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/bdns/index.js":[function(require,module,exports){
const constants = require("../moduleConstants");
const PendingCallMixin = require("../utils/PendingCallMixin");
const getBaseURL = require("../utils/getBaseURL");

function BDNS() {
    PendingCallMixin(this);
    let bdnsCache;
    const http = require("opendsu").loadApi("http");
    let isInitialized = false;

    let retrieveHosts = () => {
        const url = `${getBaseURL()}/bdns#x-blockchain-domain-request`;
        http.fetch(url)
            .then((response) => {
                return response.json()
            }).then((bdnsHosts) => {
            bdnsHosts = JSON.stringify(bdnsHosts);
            bdnsHosts = bdnsHosts.replace(/\$ORIGIN/g, getBaseURL());
            bdnsCache = JSON.parse(bdnsHosts);
            isInitialized = true;
            this.executePendingCalls();
        }).catch((err) => console.log("Failed to retrieve BDNS hosts", err));
    };

    retrieveHosts();

    const getSection = (dlDomain, section, callback) => {
        function load_or_default() {
            if (typeof dlDomain === "undefined") {
                return callback(Error(`The provided domain is undefined`));
            }

            if(typeof bdnsCache[dlDomain] === "undefined"){
                return callback(Error(`The provided domain ${dlDomain} is not configured`));
            }

            return bdnsCache[dlDomain][section] ? bdnsCache[dlDomain][section] : [getBaseURL()];
        }

        if (!isInitialized) {
            return this.addPendingCall(() => {
                if (dlDomain === undefined) {
                    return callback(new Error("The domain is not defined"));
                }
                callback(undefined, load_or_default());
            })
        }
        if (dlDomain === undefined) {
            return callback(new Error("The domain is not defined"));
        }
        callback(undefined, load_or_default());
    }

    this.getRawInfo = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain]);
            })
        }
        callback(undefined, bdnsCache[dlDomain]);
    };

    this.getBrickStorages = (dlDomain, callback) => {
        getSection(dlDomain, "brickStorages", callback);
    };

    this.getAnchoringServices = (dlDomain, callback) => {
        getSection(dlDomain, "anchoringServices", callback);
    };

    this.getContractServices = (dlDomain, callback) => {
        getSection(dlDomain, "contractServices", callback);
    };

    this.getReplicas = (dlDomain, callback) => {
        getSection(dlDomain, "replicas", callback);
    };

    this.getNotificationEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "notifications", callback);
    }

    this.getMQEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "mqEndpoints", callback);
    }

    this.addRawInfo = (dlDomain, rawInfo) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addAnchoringServices = (dlDomain, anchoringServices) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addBrickStorages = (dlDomain, brickStorages) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addReplicas = (dlDomain, replicas) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.setBDNSHosts = (bdnsHosts) => {
        isInitialized = true;
        bdnsCache = bdnsHosts;
    }
}


module.exports = new BDNS();

},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/PendingCallMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js","../utils/getBaseURL":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/getBaseURL.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/BootEngine.js":[function(require,module,exports){
function BootEngine(getKeySSI) {
    if (typeof getKeySSI !== "function") {
        throw new Error("getSeed missing or not a function");
    }
    getKeySSI = promisify(getKeySSI);

    const openDSU = require("opendsu");
    const { constants } = openDSU;
    const resolver = openDSU.loadApi("resolver");
    const pskPath = require("swarmutils").path;

    const evalBundles = async (bundles, ignore) => {
        const listFiles = promisify(this.rawDossier.listFiles);
        const readFile = promisify(this.rawDossier.readFile);

        let fileList = await listFiles(constants.CONSTITUTION_FOLDER);
        fileList = bundles
            .filter((bundle) => fileList.includes(bundle) || fileList.includes(`/${bundle}`))
            .map((bundle) => pskPath.join(constants.CONSTITUTION_FOLDER, bundle));

        if (fileList.length !== bundles.length) {
            const message = `Some bundles missing. Expected to have ${JSON.stringify(
                bundles
            )} but got only ${JSON.stringify(fileList)}`;
            if (!ignore) {
                throw new Error(message);
            } else {
                console.log(message);
            }
        }

        for (let i = 0; i < fileList.length; i++) {
            var fileContent = await readFile(fileList[i]);
            try {
                eval(fileContent.toString());
            } catch (e) {
                console.log("Failed to eval file", fileList[i], e);
            }
        }
    };

    this.boot = function (callback) {
        const __boot = async () => {
            const keySSI = await getKeySSI();
            const loadRawDossier = promisify(resolver.loadDSU);
            try {
                this.rawDossier = await loadRawDossier(keySSI);
                global.rawDossier = this.rawDossier;
            } catch (err) {
                console.log(err);
                return callback(err);
            }

            const listFiles = promisify(this.rawDossier.listFiles);
            const readFile = promisify(this.rawDossier.readFile);

            let isBootFilePresent;
            let bootConfig;
            try {
                let allFiles = await listFiles(constants.CODE_FOLDER);
                console.log("allFiles", allFiles);
                isBootFilePresent = allFiles.some((file) => file === constants.BOOT_CONFIG_FILE);
                if (isBootFilePresent) {
                    const bootConfigFile = `${constants.CODE_FOLDER}/${constants.BOOT_CONFIG_FILE}`;
                    let bootConfigfileContent = await readFile(bootConfigFile);
                    bootConfig = JSON.parse(bootConfigfileContent.toString());
                }
            } catch (error) {
                console.error("Cannot check boot config file", error);
                return callback(error);
            }

            if (!isBootFilePresent || !bootConfig) {
                return;
            }

            const { runtimeBundles, constitutionBundles } = bootConfig;

            if (typeof runtimeBundles !== "undefined" && !Array.isArray(runtimeBundles)) {
                return callback(new Error("runtimeBundles is not array"));
            }

            if (typeof constitutionBundles !== "undefined" && !Array.isArray(constitutionBundles)) {
                return callback(new Error("constitutionBundles is not array"));
            }

            try {
                await evalBundles(runtimeBundles);
            } catch (err) {
                if (err.type !== "PSKIgnorableError") {
                    console.log(err);
                    return callback(err);
                }
            }

            if (typeof constitutionBundles !== "undefined") {
                try {
                    await evalBundles(constitutionBundles, true);
                } catch (err) {
                    console.log(err);
                    return callback(err);
                }
            }
        };

        __boot()
            .then(() => callback(undefined, this.rawDossier))
            .catch(callback);
    };
}

function promisify(fn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, ...res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(...res);
                }
            });
        });
    };
}

module.exports = BootEngine;

},{"opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/NodeBootScript.js":[function(require,module,exports){
function boot(keySSI) {
    const worker_threads = "worker_threads";
    const { parentPort } = require(worker_threads);
    const { handleMessage } = require("./boot-utils.js");

    parentPort.on("message", (message) => {
        handleMessage(message, (error, result) => {
            parentPort.postMessage({ error, result });
        });
    });

    process.on("uncaughtException", (err) => {
        console.error("[worker] unchaughtException inside worker", err);
        setTimeout(() => {
            process.exit(1);
        }, 100);
    });

    function getKeySSI(callback) {
        callback(null, keySSI);
    }

    const BootEngine = require("./BootEngine.js");

    console.log(`[worker] booting DSU for keySSI ${keySSI}...`);

    const booter = new BootEngine(getKeySSI);

    booter.boot((error) => {
        if (error) {
            parentPort.postMessage({ error });
            throw error;
        }

        console.log("[worker] ready");
        parentPort.postMessage("ready");
    });
}

module.exports = boot;

},{"./BootEngine.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/BootEngine.js","./boot-utils.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/boot-utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/WorkerBootScript.js":[function(require,module,exports){
function boot(keySSI) {
    const { handleMessage } = require("./boot-utils.js");

    onmessage = (message) => {
        handleMessage(message.data, (error, result) => {
            postMessage({ error, result });
        });
    };

    function getKeySSI(callback) {
        callback(null, keySSI);
    }

    const BootEngine = require("./BootEngine.js");

    console.log(`[worker] booting DSU for keySSI ${keySSI}...`);

    const booter = new BootEngine(getKeySSI);

    booter.boot((error) => {
        if (error) {
            postMessage({ error });
            throw error;
        }

        console.log("[worker] ready");
        postMessage("ready");
    });
}

module.exports = boot;

},{"./BootEngine.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/BootEngine.js","./boot-utils.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/boot-utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/boot-utils.js":[function(require,module,exports){
function handleMessage(message, onHandleMessage) {
    // console.log("[worker] Received message", message);

    const { fn, api, args } = message;
    const callback = (error, result) => {
        console.log(`[worker] finished work ${message}`, error, result);

         // in order to ensure result serializability we JSON.stringify it if isn't a Buffer
         if (!$$.Buffer.isBuffer(result)) {
            result = JSON.stringify(result);
        }

        onHandleMessage(error, result);
    };
    try {
        const dsuArgs = [...args, callback];

        if (api) {
            // need to call the DSU's api.js method
            this.rawDossier.call(api, ...dsuArgs);
            return;
        }

        if (fn) {
            this.rawDossier[fn].apply(this.rawDossier, dsuArgs);
            return;
        }

        callback(new Error(`Received unknown task: ${JSON.stringify(message)}`));
    } catch (error) {
        onHandleMessage(error);
    }
}

module.exports = {
    handleMessage,
};

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/index.js":[function(require,module,exports){
let { ENVIRONMENT_TYPES } = require("../moduleConstants.js");

function getBootScript() {
    switch ($$.environmentType) {
        case ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            return require("./WorkerBootScript");
        case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            return require("./NodeBootScript");
        default:
            throw new Error(`Current environment ${$$.environmentType} doesn't support opendsu boot script!`);
    }
}

module.exports = getBootScript();

},{"../moduleConstants.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./NodeBootScript":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/NodeBootScript.js","./WorkerBootScript":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/WorkerBootScript.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/bricking/cachedBricking.js":[function(require,module,exports){
const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/");
const storeName = "bricks";

function putBrick(brick, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    const hash = crypto.getCryptoFunctionForKeySSI(keySSISpace.createTemplateSeedSSI("vault"), "hash");
    const brickHash = hash(brick);

    cache.put(brickHash, brick, (err, hash) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick data in cache`, err));
        }

        callback(undefined, hash);
    });
}

function getBrick(brickHash, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(brickHash, (err, brickData) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get retrieve brick <${brickHash}> from cache`, err));
        }

        callback(undefined, brickData);
    });
}

function getMultipleBricks(brickHashes, callback) {
    // The bricks need to be returned in the same order they were requested
    let brickPromise = Promise.resolve();
    for (const hl of brickHashes) {
        // TODO: FIX ME
        // This is a HACK. It should cover 99% of the cases
        // but it might still fail if the brick data transfer
        // is delayed due to network issues and the next iteration
        // resolves faster. The correct solution involves changing
        // multiple layers
        brickPromise = brickPromise.then(() => {
            return new Promise((resolve) => {
                getBrick(hl, (err, brick) => {
                    callback(err, brick);
                    resolve();
                });
            })
        })
    }
}

module.exports = {
    putBrick,
    getBrick,
    getMultipleBricks
}

},{"../cache/":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/bricking/index.js":[function(require,module,exports){
const openDSU = require("opendsu");
const bdns = openDSU.loadApi("bdns");
const {fetch, doPut} = openDSU.loadApi("http");
const constants = require("../moduleConstants");
const cache = require("../cache/").getCacheForVault(constants.CACHE.ENCRYPTED_BRICKS_CACHE);
const cachedBricking = require("./cachedBricking");
const promiseRunner = require("../utils/promise-runner");
const config = require("../config");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}

const isValidBrickHash = (hashLinkSSI, brickData) => {
    const ensureIsBuffer = require("swarmutils").ensureIsBuffer;
    const crypto = openDSU.loadAPI("crypto");
    const hashFn = crypto.getCryptoFunctionForKeySSI(hashLinkSSI, "hash");
    const actualHash = hashFn(ensureIsBuffer(brickData));
    const expectedHash = hashLinkSSI.getHash();
    return actualHash === expectedHash;
}

/**
 * Get brick
 * @param {hashLinkSSI} hashLinkSSI
 * @param {string} authToken
 * @param {function} callback
 * @returns {any}
 */
const getBrick = (hashLinkSSI, authToken, callback) => {
    const dlDomain = hashLinkSSI.getDLDomain();
    const brickHash = hashLinkSSI.getHash();
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.getBrick(brickHash, callback);
    }

    if (typeof cache === "undefined") {
        __getBrickFromEndpoint();
    } else {
        cache.get(brickHash, (err, brick) => {
            if (err || typeof brick === "undefined") {
                __getBrickFromEndpoint();
            } else {
                callback(undefined, brick);
            }
        });
    }

    function __getBrickFromEndpoint() {
        bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
            }

            if (!brickStorageArray.length) {
                return callback('No storage provided');
            }

            const queries = brickStorageArray.map((storage) => fetch(`${storage}/bricking/${dlDomain}/get-brick/${brickHash}`));

            Promise
                .all(queries)
                .then(async (responses) => {
                    let brickContent;
                    for (const response of responses) {
                        const brickData = await response.arrayBuffer();
                        if (isValidBrickHash(hashLinkSSI, brickData)) {
                            if (typeof cache !== "undefined") {
                                cache.put(brickHash, brickData);
                            }
                            brickContent = brickData;
                            break;
                        }
                    }
                    if(brickContent){
                        return callback(undefined, brickContent);
                    }
                    throw Error(`Failed to validate brick <${brickHash}>`);
                })
                .catch(err => {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick <${brickHash}> from brick storage`, err));
                });
        });
    }

};

/**
 * Get multiple bricks
 * @param {hashLinkSSIList} hashLinkSSIList
 * @param {string} authToken
 * @param {function} callback
 */

const getMultipleBricks = (hashLinkSSIList, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    const dlDomain = hashLinkSSIList[0].getDLDomain();
    const bricksHashes = hashLinkSSIList.map((hashLinkSSI) => hashLinkSSI.getHash());

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.getMultipleBricks(bricksHashes, callback);
    }

    // The bricks need to be returned in the same order they were requested
    let brickPromise = Promise.resolve();
    for (const hl of hashLinkSSIList) {
        // TODO: FIX ME
        // This is a HACK. It should cover 99% of the cases
        // but it might still fail if the brick data transfer
        // is delayed due to network issues and the next iteration
        // resolves faster. The correct solution involves changing
        // multiple layers
        brickPromise = brickPromise.then(() => {
            return new Promise((resolve) => {
                getBrick(hl, authToken, (err, brick) => {
                    callback(err, brick);
                    resolve();
                });
            })
        })
    }
};


/**
 * Put brick
 * @param {keySSI} keySSI
 * @param {ReadableStream} brick
 * @param {string} authToken
 * @param {function} callback
 * @returns {string} brickhash
 */
const putBrick = (domain, brick, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }


    if (domain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.putBrick(brick, callback);
    }

    bdns.getBrickStorages(domain, (err, brickStorageArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
        }
        const setBrick = (storage) => {
            return new Promise((resolve, reject) => {
                const putResult = doPut(`${storage}/bricking/${domain}/put-brick`, brick, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
                if (putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        };

        promiseRunner.runAll(brickStorageArray, setBrick, null, (err, results) => {
            if (err || !results.length) {
                if (!err) {
                    err = new Error('Failed to create bricks in:' + brickStorageArray);
                }
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create bricks",err));
            }

            const foundBrick = results[0];
            const brickHash = JSON.parse(foundBrick).message;
            if (typeof cache === "undefined") {
                return callback(undefined, brickHash)
            }

            cache.put(brickHash, brick, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick <${brickHash}> in cache`, err));
                    }
                    callback(undefined, brickHash);
                })

        }, new Error("Storing a brick"));
    });
};

module.exports = {getBrick, putBrick, getMultipleBricks};

},{"../cache/":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js","../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/promise-runner":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/promise-runner.js","./cachedBricking":"/home/runner/work/privatesky/privatesky/modules/opendsu/bricking/cachedBricking.js","opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/FSCache.js":[function(require,module,exports){
let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

function FSCache(folderName) {
    const self = this;
    CacheMixin(self);
    const fsName = "fs"; //do not tempt browserify
    const fs = require(fsName);
    let baseFolder = config.get(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY);
    if (typeof baseFolder === "undefined") {
        baseFolder = process.cwd();
    }
    const path = require("swarmutils").path;
    const folderPath = path.join(baseFolder, folderName);
    let storageFolderIsCreated = false;
    fs.mkdir(folderPath, {recursive: true}, (err) => {
        if (err) {
            throw err;
        }

        storageFolderIsCreated = true;
    });

    self.get = function (key, callback) {
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.get(key, callback);
            })
        } else {
            const filePath =path.join(folderPath, key)
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read file <${filePath}>`, err));
                }

                let content = data;
                try {
                    if(content != undefined && content != "undefined"){
                        content = JSON.parse(content.toString())
                    } else {
                        callback(undefined, undefined);
                    }
                } catch (e) {
                    console.log(e, content);
                    if(callback){
                        return callback(e);
                    }
                    return undefined;
                }
                callback(undefined, content);
            });
        }
    };

    self.put = function (key, value, callback) {
        if (Array.isArray(value)) {
            value = JSON.stringify(value);
        }
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.put(key, value, callback);
            });
        } else {
            if (!callback) {
                callback = () => {
                };
            }
            fs.writeFile(path.join(folderPath, key), value, callback);
        }
    }

    self.set = self.put;
}



module.exports.FSCache = FSCache;
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/PendingCallMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js","opendsu":"opendsu","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/IndexeDBCache.js":[function(require,module,exports){
let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

function IndexedDBCache(storeName, lifetime) {
    const self = this;
    CacheMixin(self);

    let db;
    let openRequest = indexedDB.open(storeName);
    openRequest.onsuccess = () => {
        db = openRequest.result;
        self.executePendingCalls();
        self.executeSerialPendingCalls();
    };

    openRequest.onupgradeneeded = () => {
        db = openRequest.result;
        db.createObjectStore(storeName);
    };

    self.get = (key, callback) => {
        if (typeof db === "undefined") {
            self.addPendingCall(() => {
                self.get(key, callback);
            });
        } else {
            let transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            let req = store.get(key);
            transaction.oncomplete = () => {
                if (typeof lifetime !== "undefined") {
                    const currentTime = Date.now();
                    const timestampedData = req.result;
                    if (typeof timestampedData === "undefined") {
                        return callback();
                    }
                    if (currentTime - timestampedData.timestamp > lifetime) {
                        self.delete(key);
                        return callback();
                    }
                    callback(undefined, timestampedData.value)
                } else {
                    callback(undefined, req.result);
                }
            }
        }
    };

    self.put = (key, value, callback) => {
        self.addSerialPendingCall((next) => {
            let transaction;
            let store
            try {
                transaction = db.transaction(storeName, "readwrite");
                store = transaction.objectStore(storeName);
            }catch (e) {
                callback(e);
                return next();
            }
            let data;
            if (typeof lifetime !== "undefined") {
                data = {
                    value: value,
                    timestamp: Date.now()
                }
            } else {
                data = value;
            }
            let req = store.put(data, key);
            transaction.oncomplete = () => {
                if (typeof callback === "function") {
                    callback(undefined, key);
                }
                next();
            }
            transaction.onabort = function() {
                console.log("Error", transaction.error);
            };
            req.onerror = function (event){
                next();
            }
        });
    };


    self.set = self.put;

    self.delete = (key, callback) => {
            self.addSerialPendingCall((next) => {
                let transaction;
                let store;
                try {
                    transaction = db.transaction(storeName, "readwrite");
                    store = transaction.objectStore(storeName);
                }catch (e) {
                    callback(e);
                    next();
                    return;
                }
                let req = store.delete(key);
                transaction.oncomplete = () => {
                    if (typeof callback === "function") {
                        callback(undefined, key);
                    }
                    next();
                }
                transaction.onabort = function() {
                    console.log("Error", transaction.error);
                };
                req.onerror = function (event){
                    next();
                }
            });
    }
}


module.exports.IndexedDBCache  = IndexedDBCache;
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/PendingCallMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/MemoryCache.js":[function(require,module,exports){

const constants = require("../moduleConstants");

function MemoryCache() {
    let storage = {};
    const self = this;

    self.get = function (key, callback) {
        if(typeof key !== "string"){
            throw new Error("Keys should be strings");
        }
        if(callback){
            callback(undefined, storage[key])
        }
        return storage[key];
    };

    self.put = function (key, value, callback) {
        if(typeof key !== "string"){
            throw new Error("Keys should be strings");
        }
        storage[key] = value;
        if(callback){
            callback(undefined, true)
        }
    }

    self.set = self.put;
}


module.exports.MemoryCache = MemoryCache;
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js":[function(require,module,exports){
let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

const IndexedDBCache = require("./IndexeDBCache").IndexedDBCache;
const FSCache        = require("./FSCache").FSCache;
const MemoryCache    = require("./MemoryCache").MemoryCache;

function getCacheForVault(storeName, lifetime) {
    if (typeof stores[storeName] === "undefined") {
        switch (config.get(constants.CACHE.VAULT_TYPE)) {
            case constants.CACHE.INDEXED_DB:
                stores[storeName] = new IndexedDBCache(storeName, lifetime);
                break;
            case constants.CACHE.FS:
                stores[storeName] = new FSCache(storeName, lifetime);
                break;
            case constants.CACHE.MEMORY:
                stores[storeName] = new MemoryCache(storeName, lifetime);
                break;
            case constants.CACHE.NO_CACHE:
                break;
            default:
                throw Error("Invalid cache type");
        }
    }

    return stores[storeName];
}

function getMemoryCache(storeName){
    return stores[storeName] = new MemoryCache(storeName);
}

module.exports = {
    getCacheForVault,
    getMemoryCache
}
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../utils/PendingCallMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js","./FSCache":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/FSCache.js","./IndexeDBCache":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/IndexeDBCache.js","./MemoryCache":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/MemoryCache.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/config/autoConfig.js":[function(require,module,exports){
const config = require("./index");
const constants = require("../moduleConstants");
const system = require("../system");
const getBaseURL = require("../utils/getBaseURL");
const errorModule = require("../error");

system.setEnvironmentVariable(constants.BDNS_ROOT_HOSTS, `${getBaseURL()}/bdns#x-blockchain-domain-request`);
switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.INDEXED_DB);
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.INDEXED_DB);
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
        break;

    default:
}

config.set(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY, constants.CACHE.BASE_FOLDER);

setGlobalVariable("createOpenDSUErrorWrapper", errorModule.createOpenDSUErrorWrapper);
setGlobalVariable("OpenDSUSafeCallback", errorModule.OpenDSUSafeCallback);
setGlobalVariable("reportUserRelevantWarning", errorModule.reportUserRelevantWarning);
setGlobalVariable("reportUserRelevantInfo", errorModule.reportUserRelevantInfo);
setGlobalVariable("reportDevRelevantInfo", errorModule.reportDevRelevantInfo);
setGlobalVariable("reportUserRelevantError", errorModule.reportUserRelevantError);
setGlobalVariable("registerMandatoryCallback", errorModule.registerMandatoryCallback);
setGlobalVariable("printOpenDSUError", errorModule.printOpenDSUError);




},{"../error":"/home/runner/work/privatesky/privatesky/modules/opendsu/error/index.js","../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../system":"/home/runner/work/privatesky/privatesky/modules/opendsu/system/index.js","../utils/getBaseURL":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/getBaseURL.js","./index":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/config/autoConfigFromEnvironment.js":[function(require,module,exports){

module.exports = function(environment){
        const config = require("./index.js");
        const constants = require("../moduleConstants");
        //const systemEnvirnoment = require("../system");

        if(environment[constants.LOADER_ENVIRONMENT_JSON.VAULT] === constants.LOADER_ENVIRONMENT_JSON.SERVER){
            config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
        }

        if(environment[constants.LOADER_ENVIRONMENT_JSON.AGENT] === constants.LOADER_ENVIRONMENT_JSON.MOBILE){
            config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
            //systemEnvirnoment.setEnvironmentVariable(constants.BDNS_ROOT_HOSTS,
        }
        console.log("Environment for vault", environment.appName,  config.get(constants.CACHE.VAULT_TYPE))
}
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./index.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js":[function(require,module,exports){
const config = {};
function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}



const autoconfigFromEnvironment = require("./autoConfigFromEnvironment");

function disableLocalVault(){
    const constants = require("../moduleConstants");
    set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
}

module.exports = {
    set,
    get,
    autoconfigFromEnvironment,
    disableLocalVault
};


},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./autoConfigFromEnvironment":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/autoConfigFromEnvironment.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/contracts/index.js":[function(require,module,exports){
const getBaseURL = require("../utils/getBaseURL");

const {
    DomainNotSupportedError,
    getSafeCommandBody,
    getNoncedCommandBody,
    getContractEndpointUrl,
    callContractEndpoint,
    callContractEndpointUsingBdns,
} = require("./utils");

async function sendCommand(method, contractEndpointPrefix, domain, commandBody, callback) {
    if (typeof commandBody === "function") {
        callback = commandBody;
        commandBody = null;
    }

    callback = $$.makeSaneCallback(callback);

    try {
        try {
            // try to send the command to the current apihub endpoint
            const currentApihubUrl = getContractEndpointUrl(getBaseURL(), domain, contractEndpointPrefix);
            const response = await callContractEndpoint(currentApihubUrl, method, domain, commandBody);
            callback(null, response);
        } catch (error) {
            // if the current apihub endpoint doesn't handle the current domain, then send the command using BDNS
            if (error instanceof DomainNotSupportedError) {
                callContractEndpointUsingBdns(method, contractEndpointPrefix, domain, commandBody, callback);
                return;
            }
            throw error;
        }
    } catch (error) {
        OpenDSUSafeCallback(callback)(
            createOpenDSUErrorWrapper(`Failed to execute domain contract method: ${JSON.stringify(commandBody)}`, error)
        );
    }
}

function generateSafeCommand(domain, contractName, methodName, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = null;
    }

    try {
        const commandBody = getSafeCommandBody(domain, contractName, methodName, params);
        sendCommand("POST", "safe-command", domain, commandBody, callback);
    } catch (error) {
        callback(error);
    }
}

async function generateNoncedCommand(signerDID, domain, contractName, methodName, params, timestamp, callback) {
    if (typeof timestamp === "function") {
        callback = timestamp;

        // check if the param before provided callback is either the timestamp or the params, since both are optional
        if (typeof params === "number") {
            timestamp = params;
            params = null;
        } else {
            timestamp = null;
        }
    }

    if (typeof params === "function") {
        callback = params;
        params = null;
        timestamp = null;
    }
    if (!signerDID) {
        return callback("signerDID not provided");
    }

    if (!timestamp) {
        timestamp = Date.now();
    }

    try {
        if (typeof signerDID === "string") {
            // signerDID contains the identifier, so we need to load the DID
            const w3cDID = require("opendsu").loadAPI("w3cdid");
            signerDID = await $$.promisify(w3cDID.resolveDID)(signerDID);
        }

        const latestBlockInfo = await $$.promisify(sendCommand)("GET", "latest-block-info", domain);
        const { number: blockNumber } = latestBlockInfo;

        const commandBody = getNoncedCommandBody(domain, contractName, methodName, params, blockNumber, timestamp, signerDID);
        sendCommand("POST", "nonced-command", domain, commandBody, callback);
    } catch (error) {
        callback(error);
    }
}

function generateSafeCommandForSpecificServer(serverUrl, ...args) {
    if (!serverUrl || typeof serverUrl !== "string") {
        throw new Error(`Invalid serverUrl specified`);
    }
    generateSafeCommand(...args);
}

function generateNoncedCommandForSpecificServer(serverUrl, ...args) {
    if (!serverUrl || typeof serverUrl !== "string") {
        throw new Error(`Invalid serverUrl specified`);
    }
    generateNoncedCommand(...args);
}

module.exports = {
    generateSafeCommand,
    generateNoncedCommand,
    generateSafeCommandForSpecificServer,
    generateNoncedCommandForSpecificServer,
};

},{"../utils/getBaseURL":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/getBaseURL.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/contracts/utils.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/contracts/utils.js":[function(require,module,exports){
const { fetch, doPost } = require("../http");
const promiseRunner = require("../utils/promise-runner");

class DomainNotSupportedError extends Error {
    constructor(domain, url) {
        super(`Domain '${domain}' not supported for calling URL ${url}`);
        this.name = "DomainNotSupportedError";
    }
}

function getCommandHash(command) {
    const { domain, contractName, methodName, params, type, blockNumber, timestamp } = command;

    const objectToHash = {
        domain,
        contractName,
        methodName,
        params,
    };

    if (type === "nonced") {
        objectToHash.blockNumber = blockNumber;
        objectToHash.timestamp = timestamp;
    }

    const crypto = require("opendsu").loadApi("crypto");
    const hash = crypto.sha256(objectToHash);

    return hash;
}

function getSafeCommandBody(domain, contractName, methodName, params) {
    if (!domain || typeof domain !== "string") {
        throw `Invalid domain specified: ${domain}!`;
    }
    if (!contractName || typeof contractName !== "string") {
        throw `Invalid contractName specified: ${contractName}!`;
    }
    if (!methodName || typeof methodName !== "string") {
        throw `Invalid methodName specified: ${methodName}!`;
    }

    if (params) {
        if (!Array.isArray(params)) {
            throw `Invalid params specified (must be a list): ${params}!`;
        }
    }

    return {
        domain,
        contractName,
        methodName,
        params,
        type: "safe",
    };
}

function getNoncedCommandBody(domain, contract, method, params, blockNumber, timestamp, signerDID) {
    if (!signerDID) {
        // params field is optional
        signerDID = timestamp;
        timestamp = blockNumber;
        blockNumber = params;
        params = null;
    }

    const commandBody = getSafeCommandBody(domain, contract, method, params);
    commandBody.type = "nonced";
    commandBody.blockNumber = blockNumber;
    commandBody.timestamp = timestamp;
    commandBody.signerDID = signerDID.getIdentifier();

    const hash = getCommandHash(commandBody);
    const signature = signerDID.sign(hash);

    commandBody.requesterSignature = signature;

    return commandBody;
}

function getContractEndpointUrl(baseUrl, domain, contractEndpointPrefix) {
    return `${baseUrl}/contracts/${domain}/${contractEndpointPrefix}`;
}

async function callContractEndpoint(url, method, domain, body) {
    let response;
    if (method === "GET") {
        response = await fetch(url);
        if (response.statusCode === 404) {
            throw new DomainNotSupportedError(domain, url);
        }

        response = await response.json();
    } else {
        try {
            response = await $$.promisify(doPost)(url, body);
        } catch (error) {
            if (error.statusCode === 404) {
                throw new DomainNotSupportedError(domain, url);
            }
            throw error;
        }
    }

    if (response) {
        try {
            response = JSON.parse(response);
        } catch (error) {
            // the response isn't a JSON so we keep it as it is
        }

        if (response.optimisticResult) {
            try {
                response.optimisticResult = JSON.parse(response.optimisticResult);
            } catch (error) {
                // the response isn't a JSON so we keep it as it is
            }
        }
    }

    return response;
}

async function callContractEndpointUsingBdns(method, contractEndpointPrefix, domain, commandBody, callback) {
    let contractServicesArray = [];
    try {
        const bdns = require("opendsu").loadApi("bdns");
        contractServicesArray = await $$.promisify(bdns.getContractServices)(domain);
    } catch (error) {
        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get contract services from bdns'`, error));
    }

    if (!contractServicesArray.length) {
        return callback("No contract service provided");
    }
    const runContractMethod = async (service) => {
        const url = getContractEndpointUrl(service, domain, contractEndpointPrefix);
        const response = await callContractEndpoint(url, method, domain, commandBody);
        return response;
    };

    promiseRunner.runOneSuccessful(contractServicesArray, runContractMethod, callback, new Error("get Contract Service"));
}

module.exports = {
    DomainNotSupportedError,
    getSafeCommandBody,
    getNoncedCommandBody,
    getContractEndpointUrl,
    callContractEndpoint,
    callContractEndpointUsingBdns,
};

},{"../http":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js","../utils/promise-runner":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/promise-runner.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/index.js":[function(require,module,exports){
const keySSIResolver = require("key-ssi-resolver");
const crypto = require("pskcrypto");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const CryptoFunctionTypes = keySSIResolver.CryptoFunctionTypes;
const jwtUtils = require("./jwt");

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

const {JWT_ERRORS} = jwtUtils;

const getCryptoFunctionForKeySSI = (keySSI, cryptoFunctionType) => {
    return cryptoRegistry.getCryptoFunction(keySSI, cryptoFunctionType);
}
const hash = (keySSI, data, callback) => {
    console.log("This function is obsolete");
    callback(undefined, hashSync(keySSI, data));
};

const hashSync = (keySSI, data) => {
    console.log("This function is obsolete");
    if (typeof data === "object" && !$$.Buffer.isBuffer(data)) {
        data = JSON.stringify(data);
    }
    const hash = cryptoRegistry.getHashFunction(keySSI);
    return hash(data);
}

const encrypt = (data, encryptionKey) => {
    const pskEncryption = crypto.createPskEncryption("aes-256-gcm");
    return pskEncryption.encrypt(data, encryptionKey);
};

const decrypt = (data, encryptionKey) => {
    const pskEncryption = crypto.createPskEncryption("aes-256-gcm");
    return pskEncryption.decrypt(data, encryptionKey);
};

const ecies_encrypt_ds = (senderKeySSI, receiverKeySSI, data) => {
    const ecies_encrypt_ds = getCryptoFunctionForKeySSI(senderKeySSI, CryptoFunctionTypes.ECIES_ENCRYPTION_DS);
    return ecies_encrypt_ds(senderKeySSI.getKeyPair(), receiverKeySSI.getPublicKey("raw"), data);
};

const ecies_decrypt_ds = (receiverKeySSI, data) => {
    const ecies_decrypt_ds = getCryptoFunctionForKeySSI(receiverKeySSI, CryptoFunctionTypes.ECIES_DECRYPTION_DS);
    return ecies_decrypt_ds(receiverKeySSI.getPrivateKey(), data);
};

const deriveEncryptionKey = (password) => {
    return crypto.deriveKey(password);
}

const convertDerSignatureToASN1 = (derSignature) => {
    return require('pskcrypto').decodeDerToASN1ETH(derSignature);
};

const convertASN1SignatureToDer = (ans1Signature) => {

};

const sign = (keySSI, data, callback) => {
    const sign = cryptoRegistry.getSignFunction(keySSI);
    if (typeof sign !== "function") {
        throw Error("Signing not available for " + keySSI.getIdentifier(true));
    } else {
        callback(undefined, sign(data, keySSI.getPrivateKey()));
    }
};

const verifySignature = (keySSI, data, signature, publicKey, callback) => {
    if (typeof publicKey === "function") {
        callback = publicKey;
        publicKey = keySSI.getPublicKey();
    }
    const verify = cryptoRegistry.getVerifyFunction(keySSI);
    callback(undefined, verify(data, publicKey, signature));
};

const generateEncryptionKey = (keySSI, callback) => {
    const generateEncryptionKey = cryptoRegistry.getEncryptionKeyGenerationFunction(keySSI);
    callback(undefined, generateEncryptionKey());
};

const encode = (keySSI, data) => {
    console.log("This function is obsolete");
    const encode = cryptoRegistry.getEncodingFunction(keySSI);
    return encode(data);
};

const decode = (keySSI, data) => {
    console.log("This function is obsolete");
    const decode = cryptoRegistry.getDecodingFunction(keySSI);
    return decode(data);
};

const sha256 = (dataObj) => {
    const pskcrypto = require("pskcrypto");
    const hashBuffer = pskcrypto.objectHash("sha256", dataObj);
    return pskcrypto.pskBase58Encode(hashBuffer);
};

const generateRandom = (length) => {
    const pskcrypto = require("pskcrypto");
    const randomBuffer = pskcrypto.randomBytes(length);
    return pskcrypto.pskBase58Encode(randomBuffer);
}

const encodeBase58 = (data) => {
    const encodeFn = getCryptoFunctionForKeySSI(templateSeedSSI, "encoding");
    return encodeFn(data);
};

const decodeBase58 = (data) => {
    const decodeFn = getCryptoFunctionForKeySSI(templateSeedSSI, "decoding");
    return decodeFn(data);
};


/**
 *
 * @param rawPublicKey
 * @param outputFormat - pem or der
 */
const convertPublicKey = (rawPublicKey, outputFormat, curveName) => {
    const ecGenerator = crypto.createKeyPairGenerator();
    return ecGenerator.convertPublicKey(rawPublicKey, {outputFormat, namedCurve: curveName});
};

/**
 *
 * @param rawPrivateKey
 * @param outputFormat - pem or der
 */
const convertPrivateKey = (rawPrivateKey, outputFormat) => {
    const ecGenerator = crypto.createKeyPairGenerator();
    return ecGenerator.convertPrivateKey(rawPrivateKey, {outputFormat});
}

const createJWT = (seedSSI, scope, credentials, options, callback) => {
    jwtUtils.createJWT(
        {
            seedSSI,
            scope,
            credentials,
            options,
            sign,
        },
        callback
    );
};

const verifyJWT = (jwt, rootOfTrustVerificationStrategy, callback) => {
    jwtUtils.verifyJWT(
        {
            jwt,
            rootOfTrustVerificationStrategy,
            verifySignature,
        },
        callback
    );
};

const createCredential = (issuerSeedSSI, credentialSubjectSReadSSI, callback) => {
    createJWT(issuerSeedSSI, "", null, {subject: credentialSubjectSReadSSI}, callback);
};

const createAuthToken = (holderSeedSSI, scope, credential, callback) => {
    createJWT(holderSeedSSI, scope, credential, null, callback);
};

const createPresentationToken = (holderSeedSSI, scope, credential, callback) => {
    createJWT(holderSeedSSI, scope, credential, null, callback);
};

const verifyAuthToken = (jwt, listOfIssuers, callback) => {
    if (!listOfIssuers || !listOfIssuers.length) return callback(JWT_ERRORS.EMPTY_LIST_OF_ISSUERS_PROVIDED);

    // checks every credentials from the JWT's body to see if it has at least one JWT issues by one of listOfIssuers for the current subject
    const rootOfTrustVerificationStrategy = ({body}, verificationCallback) => {
        const {sub: subject, credentials} = body;
        // the JWT doesn't have credentials specified so we cannot check for valid authorizarion
        if (!credentials) return verificationCallback(null, false);

        const currentSubject = jwtUtils.getReadableSSI(subject);

        const credentialVerifiers = credentials.map((credential) => {
            return new Promise((resolve) => {
                verifyJWT(
                    credential,
                    ({body}, credentialVerificationCallback) => {
                        // check if credential was issued for the JWT that we are verifying the authorization for
                        const credentialSubject = jwtUtils.getReadableSSI(body.sub);
                        const isCredentialIssuedForSubject = !!credentialSubject && credentialSubject === currentSubject;
                        if (!isCredentialIssuedForSubject) return credentialVerificationCallback(null, false);

                        const credentialIssuer = jwtUtils.getReadableSSI(body.iss);

                        // console.log(`Checking for credentialIssuer ${credentialIssuer} inside `, listOfIssuers);
                        // listOfIssuers.forEach(issuer => {
                        //     console.log(`Valid issuer ${issuer}: ${jwtUtils.getReadableSSI(issuer)}`);
                        // })

                        const isValidIssuer = listOfIssuers.some((issuer) => !!credentialIssuer
                            && jwtUtils.getReadableSSI(issuer) === credentialIssuer);
                        credentialVerificationCallback(null, isValidIssuer);
                    },
                    (credentialVerifyError, isCredentialValid) => {
                        if (credentialVerifyError) return resolve(false);
                        resolve(isCredentialValid);
                    }
                );
            }).catch(() => {
                // is something went wrong, we deny the JWT
                return false;
            });
        });

        Promise.all(credentialVerifiers)
            .then((credentialVerifierResults) => {
                const hasAtLeastOneValidIssuer = credentialVerifierResults.some((result) => result);
                if (!hasAtLeastOneValidIssuer) return verificationCallback(null, false);
                verificationCallback(null, true);
            })
            .catch(() => {
                // is something went wrong, we deny the JWT
                verificationCallback(null, false);
            });
    };

    verifyJWT(jwt, rootOfTrustVerificationStrategy, callback);
};


function createBloomFilter(options) {
    const BloomFilter = require("psk-dbf");
    return new BloomFilter(options);
}


module.exports = {
    getCryptoFunctionForKeySSI,
    hash,
    hashSync,
    generateRandom,
    encrypt,
    decrypt,
    sign,
    convertDerSignatureToASN1,
    verifySignature,
    generateEncryptionKey,
    encode,
    decode,
    encodeBase58,
    decodeBase58,
    sha256,
    createJWT,
    verifyJWT,
    createCredential,
    createAuthToken,
    verifyAuthToken,
    createPresentationToken,
    getReadableSSI: jwtUtils.getReadableSSI,
    parseJWTSegments: jwtUtils.parseJWTSegments,
    createBloomFilter,
    JWT_ERRORS,
    deriveEncryptionKey,
    convertPrivateKey,
    convertPublicKey,
    ecies_encrypt_ds,
    ecies_decrypt_ds
};

},{"./jwt":"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/jwt.js","key-ssi-resolver":"key-ssi-resolver","psk-dbf":false,"pskcrypto":"pskcrypto"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/jwt.js":[function(require,module,exports){
const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
const keySSIFactory = keySSIResolver.KeySSIFactory;

const HEADER_TYPE = "SeedSSIJWT";
const JWT_VALABILITY_SECONDS = 5 * 365 * 24 * 60 * 60; // 5 years default

const JWT_ERRORS = {
    EMPTY_JWT_PROVIDED: "EMPTY_JWT_PROVIDED",
    INVALID_JWT_FORMAT: "INVALID_JWT_FORMAT",
    INVALID_JWT_PRESENTATION: "INVALID_JWT_PRESENTATION",
    INVALID_JWT_HEADER: "INVALID_JWT_HEADER",
    INVALID_JWT_BODY: "INVALID_JWT_BODY",
    INVALID_JWT_HEADER_TYPE: "INVALID_JWT_HEADER_TYPE",
    INVALID_JWT_ISSUER: "INVALID_JWT_ISSUER",
    INVALID_CREDENTIALS_FORMAT: "INVALID_CREDENTIALS_FORMAT",
    JWT_TOKEN_EXPIRED: "JWT_TOKEN_EXPIRED",
    JWT_TOKEN_NOT_ACTIVE: "JWT_TOKEN_NOT_ACTIVE",
    INVALID_JWT_SIGNATURE: "INVALID_JWT_SIGNATURE",
    ROOT_OF_TRUST_VERIFICATION_FAILED: "ROOT_OF_TRUST_VERIFICATION_FAILED",
    EMPTY_LIST_OF_ISSUERS_PROVIDED: "EMPTY_LIST_OF_ISSUERS_PROVIDED",
    INVALID_SSI_PROVIDED: "INVALID_SSI_PROVIDED"
};

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function encodeBase58(data) {
    return cryptoRegistry.getEncodingFunction(templateSeedSSI)(data).toString();
};

function decodeBase58(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI)(data);
    if (keepBuffer) {
        return decodedValue;
    }
    return decodedValue ? decodedValue.toString() : null;
};

function nowEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

function getReadableSSI(ssi) {
    if (typeof ssi === "string" && ssi.indexOf('ssi') === 0) {
        // ssi is actually the readable ssi
        return ssi;
    }

    ssi = ssi.getIdentifier ? ssi.getIdentifier() : ssi;
    let readableSSI = decodeBase58(ssi);
    if (!readableSSI) {
        // invalid base58 string
        return null;
    }
    if (readableSSI.indexOf('ssi') !== 0) {
        // invalid ssi format
        return null;
    }

    return readableSSI;
}

function createJWT({seedSSI, scope, credentials, options, sign}, callback) {
    if (typeof seedSSI === "string") {
        const keyssiSpace = require('opendsu').loadApi("keyssi");
        try {
            seedSSI = keyssiSpace.parse(seedSSI);
        } catch (e) {
            return callback(e);
        }
    }
    const sReadSSI = seedSSI.derive();

    let {subject, valability, ...optionsRest} = options || {};
    valability = valability || JWT_VALABILITY_SECONDS;

    if (subject) {
        subject = getReadableSSI(subject);
    } else {
        subject = sReadSSI.getIdentifier(true);
    }
    if (!subject) {
        return callback(JWT_ERRORS.INVALID_SSI_PROVIDED);
    }

    const issuer = sReadSSI.getIdentifier(true);
    if (!issuer) {
        return callback(JWT_ERRORS.INVALID_SSI_PROVIDED);
    }

    if (credentials) {
        credentials = Array.isArray(credentials) ? credentials : [credentials];
    }

    const header = {
        typ: HEADER_TYPE,
    };

    const now = nowEpochSeconds();
    const body = {
        sub: subject,
        // aud: encodeBase58(scope),
        scope,
        iss: issuer,
        publicKey: seedSSI.getPublicKey(),
        iat: now,
        nbf: now,
        exp: now + valability,
        credentials,
        options: optionsRest,
    };

    const segments = [encodeBase58(JSON.stringify(header)), encodeBase58(JSON.stringify(body))];

    const jwtToSign = segments.join(".");
    const hashFn = require("../crypto").getCryptoFunctionForKeySSI(seedSSI, "hash");
    const hashResult = hashFn(jwtToSign);
    sign(seedSSI, hashResult, (signError, signResult) => {
        if (signError || !signResult) return callback(signError);
        const encodedSignResult = encodeBase58(signResult);

        const jwt = `${jwtToSign}.${encodedSignResult}`;
        callback(null, jwt);
    });
}

function safeParseEncodedJson(data, keepBuffer) {
    try {
        const result = JSON.parse(decodeBase58(data, keepBuffer));
        return result;
    } catch (e) {
        return e;
    }
}

function parseJWTSegments(jwt, callback) {
    if (!jwt) return callback(JWT_ERRORS.EMPTY_JWT_PROVIDED);
    if (typeof jwt !== "string") return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const segments = jwt.split(".");
    if (segments.length !== 3) return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const header = safeParseEncodedJson(segments[0]);
    if (header instanceof Error || !header) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const body = safeParseEncodedJson(segments[1]);
    if (body instanceof Error || !body) return callback(JWT_ERRORS.INVALID_JWT_BODY);

    const signatureInput = `${segments[0]}.${segments[1]}`;
    const signature = decodeBase58(segments[2], true);
    if (!signature) {
        // the signature couldn't be decoded due to an invalid signature
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    return callback(null, {header, body, signature, signatureInput});
}

function isJwtExpired(body) {
    return new Date(body.exp * 1000) < new Date();
}

function isJwtNotActive(body) {
    return new Date(body.nbf * 1000) >= new Date();
}

function verifyJWTContent(jwtContent, callback) {
    const {header, body} = jwtContent;

    if (header.typ !== HEADER_TYPE) return callback(JWT_ERRORS.INVALID_JWT_HEADER_TYPE);
    if (!body.iss) return callback(JWT_ERRORS.INVALID_JWT_ISSUER);
    if (isJwtExpired(body)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
    if (isJwtNotActive(body)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);

    if (body.credentials && !Array.isArray(body.credentials)) return callback(JWT_ERRORS.INVALID_CREDENTIALS_FORMAT);

    callback(null);
}

const verifyJWT = ({jwt, rootOfTrustVerificationStrategy, verifySignature}, callback) => {
    parseJWTSegments(jwt, (parseError, jwtContent) => {
        if (parseError) return callback(parseError);

        verifyJWTContent(jwtContent, (verifyError) => {
            if (verifyError) return callback(verifyError);

            const {header, body, signatureInput, signature} = jwtContent;
            const {iss: sReadSSIString, publicKey} = body;

            const sReadSSI = keySSIFactory.create(sReadSSIString);
            const hashFn = require("../crypto").getCryptoFunctionForKeySSI(sReadSSI, "hash");
            const hash = hashFn(signatureInput);
            verifySignature(sReadSSI, hash, signature, publicKey, (verifyError, verifyResult) => {
                if (verifyError || !verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

                if (typeof rootOfTrustVerificationStrategy === "function") {
                    rootOfTrustVerificationStrategy({header, body}, (verificationError, verificationResult) => {
                        if (verificationError || !verificationResult) {
                            return callback(JWT_ERRORS.ROOT_OF_TRUST_VERIFICATION_FAILED);
                        }
                        callback(null, true);
                    });
                    return;
                }

                callback(null, true);
            });
        });
    });
};

module.exports = {
    createJWT,
    verifyJWT,
    getReadableSSI,
    parseJWTSegments,
    JWT_ERRORS,
};

},{"../crypto":"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/index.js","key-ssi-resolver":"key-ssi-resolver","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/conflictSolvingStrategies/timestampMergingStrategy.js":[function(require,module,exports){
module.exports.TimestampMergingStrategy = function(){

}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/impl/BasicDB.js":[function(require,module,exports){
/*
    An OpenDSU  BasicDB is a simple noSQL database
    The DB is used with a concept of "table" and rows (records) that have multiple versions
    The support for multiple versions is offered by getVersions function and by automatically managing 2 fields in the records:
         - the "__version" field representing the height of the graph
         - the "__previousRecord" field pointing to the previous version of the record
         - the "__changeId" is unique id, is used to quickly determine the unique id of parent node/s for future conflict solving
         - the "__timestamp" is a timestamp, number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

    As you can see, nothing is ever really updated, even the deletion is done by marking the record with the field "deleted"
 */

const ObservableMixin = require("../../utils/ObservableMixin");
let bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

/*
const crypto = require("crypto"); TODO: if required use from pskcrypto to have a single and portable point in all code

function uid(bytes = 32) {
    // node
    if (process) {
        return crypto.randomBytes(bytes).toString('base64')
    }
    // browser
    else {
        if (!crypto || !crypto.getRandomValues) {
            throw new Error('crypto.getRandomValues not supported by the browser.')
        }
        return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
    }
}  */


function BasicDB(storageStrategy) {
    let self = this;
    ObservableMixin(this);

    storageStrategy.on("initialised", () => {
        this.finishInitialisation();
        this.dispatchEvent("initialised");
    });

    this.addIndex = function (tableName, fieldName, forceReindex, callback) {
        if (typeof forceReindex === "function") {
            callback = forceReindex;
            forceReindex = false;
        }

        if (typeof forceReindex === "undefined") {
            forceReindex = false;
        }

        storageStrategy.addIndex(tableName, fieldName, forceReindex, callback);
    }
    /*
        Get the whole content of the table and asynchronously return an array with all the  records satisfying the condition tested by the filterFunction
     */
    this.filter = function (tableName, query, sort, limit, callback) {
        storageStrategy.filter(tableName, query, sort, limit, callback);
    };

    this.query = this.filter;

    function getDefaultCallback(message, tableName, key) {
        return function (err, res) {
            if (err) {
                reportUserRelevantError(message + ` with errors in table ${tableName} for key ${key}`, err);
            } else {
                console.log(message, `in table ${tableName} for key ${key}`);
            }
        }
    }

    /*
      Insert a record, return an error if an record with thew same key already exists
    */
    this.insertRecord = function (tableName, key, record, callback) {
        callback = callback ? callback : getDefaultCallback("Inserting a record", tableName, key);

        self.getRecord(tableName, key, function (err, res) {
            if (!err || res) {
                //newRecord = Object.assign(newRecord, {__version:-1});
                return callback(createOpenDSUErrorWrapper("Failed to insert over an existing record", new Error("Trying to insert into existing record")));
            }
            const sharedDSUMetadata = {}
            sharedDSUMetadata.__version = 0;
            sharedDSUMetadata.pk = key;
            //sharedDSUMetadata.__changeId = uid();
            sharedDSUMetadata.__timestamp = Date.now();
            storageStrategy.insertRecord(tableName, key, Object.assign(sharedDSUMetadata, record), (err, res) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to insert record with key ${key} in table ${tableName} `, err));
                }

                self.dispatchEvent("change", JSON.stringify({table: tableName, pk: key}));
                callback(undefined, res);
            });
        });
    };


    /*
        Update a record, return an error if does not exists (does not do an insert)
     */
    this.updateRecord = function (tableName, key, newRecord, callback) {
        callback = callback ? callback : getDefaultCallback("Updating a record", tableName, key);
        let currentRecord;

        function doVersionIncAndUpdate(currentRecord, callback) {
            newRecord.__version++;
            newRecord.__timestamp = Date.now();
            //newRecord.__changeId = uid();

            if (newRecord.__version == 0) {
                storageStrategy.insertRecord(tableName, key, newRecord, callback);
            } else {
                storageStrategy.updateRecord(tableName, key, newRecord, currentRecord, callback);
            }
        }

        self.getRecord(tableName, key, function (err, res) {
            if (err || !res) {
                //newRecord = Object.assign(newRecord, {__version:-1});
                return callback(createOpenDSUErrorWrapper("Failed to update a record that does not exist", err));
            }
            if (res) {
                currentRecord = res;
                newRecord.__version = currentRecord.__version;
                newRecord.pk = key;
            }
            doVersionIncAndUpdate(currentRecord, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update record with key ${key} in table ${tableName} `, err));
                }

                self.dispatchEvent("change", JSON.stringify({table: tableName, pk: key}));
                callback(undefined, newRecord);
            });
        });
    }

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        storageStrategy.getRecord(tableName, key, function (err, res) {
            if (err || res.__deleted) {
                return callback(createOpenDSUErrorWrapper(`Missing record in table ${tableName} and key ${key}`, err));
            }
            callback(undefined, res);
        });
    };

    /*
      Get the history of a record, including the deleted versions
   */
    this.getHistory = function (tableName, key, callback) {
        storageStrategy.getRecord(tableName, key, function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`No history for table ${tableName} and key ${key}`, err));
            }
            callback(undefined, self.getRecordVersions(res));
        });
    };

    /*
      Delete a record
     */
    this.deleteRecord = function (tableName, key, callback) {
        self.getRecord(tableName, key, function (err, record) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Could not retrieve record with key ${key} does not exist ${tableName} `, err));
            }

            const currentRecord = JSON.parse(JSON.stringify(record));
            record.__version++;
            record.__timestamp = Date.now();
            record.__deleted = true;
            storageStrategy.updateRecord(tableName, key, record, currentRecord, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update with key ${key} in table ${tableName} `, err));
                }

                self.dispatchEvent("change", JSON.stringify({table: tableName, pk: key}));
                callback();
            });
        })
    };

    this.getRecordVersions = function (record) {
        let arrRes = []
        while (record) {
            arrRes.unshift(record);
            record = record.__previousRecord;
        }
        return arrRes;
    }

    this.getIndexedFields = function (tableName, callback) {
        storageStrategy.getIndexedFields(tableName, callback);
    }

    this.writeKey = function (key, value, callback) {
        storageStrategy.writeKey(key, value, callback);
    };

    this.readKey = function (key, callback) {
        storageStrategy.readKey(key, callback);
    }
    this.beginBatch = () => {
        storageStrategy.beginBatch()
    }

    this.cancelBatch = (callback) => {
        storageStrategy.cancelBatch(callback)
    }

    this.commitBatch = (callback) => {
        storageStrategy.commitBatch(callback)
    }


    bindAutoPendingFunctions(this, ["on", "off"]);
    //============================================================
    // To not add others property on this object below this call =
    //============================================================
}

module.exports = BasicDB;

},{"../../utils/BindAutoPendingFunctions":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/BindAutoPendingFunctions.js","../../utils/ObservableMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/ObservableMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/impl/DSUDBUtil.js":[function(require,module,exports){
module.exports = {
    ensure_WalletDB_DSU_Initialisation: function (keySSI, dbName, callback) {
        let resolver = require("../../resolver");
        let keySSIApis = require("../../keyssi");
        let constants = require("../../moduleConstants");

        let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, sharableSSI) {
                callback(undefined, dsu, sharableSSI);
            }, 10000);

        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if ((err || !dsuInstance) && keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI) {
                return  createSeedDSU();
            }

            waitForWritableSSI(dsuInstance);
        });

        function createSeedDSU() {
            let writableDSU;

            function createWritableDSU() {
                let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
                resolver.createDSU(writableSSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create writable DSU while initialising shared database " + dbName, err));
                    }
                    writableDSU = res;
                    createWrapperDSU();
                });
            }

            function createWrapperDSU() {
                resolver.createDSUForExistingSSI(keySSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create wrapper DSU while initialising shared database " + dbName, err));
                    }
                    res.beginBatch();
                    res.mount("/data", writableDSU.getCreationSSI(), function (err, resSSI) {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper("Failed to mount writable DSU in wrapper DSU while initialising shared database " + dbName, err));
                        }
                        res.commitBatch((err) => {
                            if (err) {
                                return callback(createOpenDSUErrorWrapper("Failed to anchor batch", err));
                            }
                            doStorageDSUInitialisation(writableDSU, keySSI.derive());
                        });
                    });
                });
            }

            reportUserRelevantWarning("Creating a new shared database");
            createWritableDSU();
        }

        function waitForWritableSSI(dsuInstance) {
            dsuInstance.getArchiveForPath("/data/dsu-metadata-log", (err, result) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to load writable DSU " + dbName, err));
                }

                const keyssiAPI = require("opendsu").loadAPI("keyssi");
                const writableSSI = keyssiAPI.parse(result.archive.getCreationSSI());
                if (writableSSI.getTypeName() === "sread") {
                    console.log("Delaying the loading of DSU based on the fact that current stare not reflecting a DB dsu type structure");
                    return setTimeout(() => {
                        dsuInstance.load(waitForWritableSSI);
                    }, 1000);
                }

                doStorageDSUInitialisation(result.archive, keySSI);
                reportUserRelevantWarning("Loading a shared database");
            });
        }

    },
    ensure_MultiUserDB_DSU_Initialisation: function (keySSI, dbName, userId, callback) {
    }
}

},{"../../keyssi":"/home/runner/work/privatesky/privatesky/modules/opendsu/keyssi/index.js","../../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../../resolver":"/home/runner/work/privatesky/privatesky/modules/opendsu/resolver/index.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/index.js":[function(require,module,exports){
let util = require("./impl/DSUDBUtil")


function getBasicDB(storageStrategy, conflictSolvingStrategy){
    let BasicDB = require("./impl/BasicDB");
    return new BasicDB(storageStrategy, conflictSolvingStrategy);
}

function getMultiUserDB(keySSI, dbName){
    throw "Not implemented yet";
    let storageStrategy = require("./storageStrategies/MultiUserStorageStrategy");
    let conflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy");
}

let getSharedDB = function(keySSI, dbName){
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy());

    util.ensure_WalletDB_DSU_Initialisation(keySSI, dbName, function(err, _storageDSU, sharableSSI){
        if (err) {
            return OpenDSUSafeCallback()(createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }
        storageStrategy.initialise(_storageDSU, dbName);
        console.log("Finishing initialisation");

        db.getShareableSSI = function(){
                return sharableSSI;
        };
    })

    return db;
};

module.exports = {
    getBasicDB,
    getWalletDB: getSharedDB,
    getMultiUserDB,
    getSharedDB
}

},{"./conflictSolvingStrategies/timestampMergingStrategy":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/conflictSolvingStrategies/timestampMergingStrategy.js","./impl/BasicDB":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/impl/BasicDB.js","./impl/DSUDBUtil":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/impl/DSUDBUtil.js","./storageStrategies/MultiUserStorageStrategy":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/MultiUserStorageStrategy.js","./storageStrategies/SingleDSUStorageStrategy":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/SingleDSUStorageStrategy.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/MultiUserStorageStrategy.js":[function(require,module,exports){

function MultiUserStorageStrategy(){


    this.initialise = function(_storageDSU, _dbName, _onInitialisationDone){
        storageDSU              = _storageDSU;
        afterInitialisation     = _afterInitialisation;
        dbName                  = _dbName;
    }


}
module.exports = MultiUserStorageStrategy;
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/Query.js":[function(require,module,exports){
function Query(queryArray){
    let conditions = [];

    function queryParser(query) {
        query.forEach(fieldQuery => {
            const splitQuery = fieldQuery.split(" ");
            if (splitQuery.length < 3) {
                throw Error(`Invalid query format. A query's format is <field> <operator> <value>`);
            }
            const operatorKeys = Object.keys(operators);
            const operatorIndex = splitQuery.findIndex(operator => {
                return operatorKeys.findIndex(el => el === operator) !== -1;
            });

            if (operatorIndex === -1) {
                throw Error(`The provided query does not contain a valid operator.`);
            }

            const field = splitQuery.slice(0, operatorIndex).join(" ");
            const operator = splitQuery[operatorIndex];
            const value = splitQuery.slice(operatorIndex + 1).join(" ");

            conditions.push([field, operator, value]);
        });

    }

    this.filterValuesForIndex = (valueArray)=> {
        let conds = conditions.filter(cond => cond[0] === this.getIndexName());
        return valueArray.filter(val => {
            for (let i = 0; i < conds.length; i++) {
                if (!operators[conds[i][1]](val, conds[i][2])) {
                    return false;
                }
            }

            return true;
        });
    }

    this.filter = (sortedValues, getNextRecordForValue, limit, callback) => {
        let conds = conditions.filter(cond => cond[0] !== this.getIndexName());
        let filteredRecords = [];

        function getNextRecord(currentIndex){
            if (currentIndex === sortedValues.length) {
                return callback(undefined, filteredRecords);
            }
            getNextRecordForValue(sortedValues[currentIndex], (err, record) => {
                if (record === null) {
                    getNextRecord(currentIndex + 1);
                }else{
                    processRecord(record);
                    if (currentIndex === sortedValues.length || filteredRecords.length === limit) {
                        return callback(undefined, filteredRecords);
                    }
                    getNextRecord(currentIndex);
                }
            });
        }

        function processRecord(record) {
            for (let i = 0; i < conds.length; i++) {
                if (!operators[conds[i][1]](record[conds[i][0]], conds[i][2])) {
                    return;
                }
            }
            filteredRecords.push(record);
        }

        getNextRecord(0);
    };

    this.sortValues = (values, sortType) => {
        let compareFn;
        try {
            compareFn = getCompareFunction(sortType);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get compare function`, e);
        }

        values.sort(compareFn);
    };

    this.getIndexName = () => {
        return conditions[0][0];
    };

    const operators = {
        "<": function (x, y) {
            return x < y
        },
        "<=": function (x, y) {
            return x <= y
        },
        ">": function (x, y) {
            return x > y
        },
        ">=": function (x, y) {
            return x >= y
        },
        "==": function (x, y) {
            return x == y
        },
        "like": function (str, regex) {
            if (typeof regex === "string") {
                let splitRegex = regex.split("/");
                if (splitRegex[0] === '') {
                    splitRegex = splitRegex.slice(1);
                }
                let flag = undefined;
                if (splitRegex.length > 1) {
                    flag = splitRegex.pop();
                }
                if (flag === '') {
                    flag = undefined;
                }
                regex = new RegExp(splitRegex.join('/'), flag);
            }
            // return regex.test(str);
            return str.match(regex);
        }
    };

    function getCompareFunction(sortOrder) {
        if (sortOrder === "asc" || sortOrder === "ascending") {
            return function (a, b) {
                if (a < b) {
                    return -1;
                }

                if (a === b) {
                    return 0
                }

                if (a > b) {
                    return 1;
                }
            }
        } else if (sortOrder === "dsc" || sortOrder === "descending") {
            return function (a, b) {
                if (a > b) {
                    return -1;
                }

                if (a === b) {
                    return 0
                }

                if (a < b) {
                    return 1;
                }
            }
        } else {
            throw Error(`Invalid sort order provided <${sortOrder}>`);
        }
    }

    queryParser(queryArray);
}

module.exports = Query;
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/SingleDSUStorageStrategy.js":[function(require,module,exports){
const ObservableMixin = require("../../utils/ObservableMixin");

function SingleDSUStorageStrategy() {
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    ObservableMixin(this);

    this.initialise = function (_storageDSU, _dbName) {
        storageDSU = _storageDSU;
        dbName = _dbName;
        this.dispatchEvent("initialised");
    }
    this.beginBatch = () => {
        storageDSU.beginBatch();
    }

    this.cancelBatch = (callback) => {
        storageDSU.cancelBatch(callback);
    }

    this.commitBatch = (callback) => {
        storageDSU.commitBatch(callback);
    }

    function readTheWholeTable(tableName, callback) {
        getPrimaryKeys(tableName, (err, recordKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read the records in table ${tableName}`, err));
            }
            const table = {};
            const TaskCounter = require("swarmutils").TaskCounter;
            const tc = new TaskCounter(() => {
                return callback(undefined, table);
            });
            tc.increment(recordKeys.length);
            recordKeys.forEach(recordKey => {
                self.getRecord(tableName, recordKey, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${recordKey} in table ${tableName}`, err));
                    }

                    table[recordKey] = record;
                    tc.decrement();
                });
            })
        });
    }

    /*
       Get the whole content of the table and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
    */
    this.filterTable = function (tableName, filterFunction, callback) {
        readTheWholeTable(tableName, function (err, tbl) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`, err));
            }
            let result = [];
            for (let n in tbl) {
                let item = tbl[n];
                if (filterFunction(item)) {
                    item.__key = n;
                    result.push(item);
                }
            }
            callback(undefined, result);
        });
    };

    function checkFieldIsIndexed(tableName, fieldName, callback) {
        const path = getIndexPath(tableName, fieldName);
        storageDSU.stat(path, (err, stat) => {
            if (err || typeof stat.type === "undefined") {
                return callback(undefined, false);
            }
            callback(undefined, true);
        });
    }

    this.filter = function (tableName, conditionsArray, sort, limit, callback) {
        if (typeof conditionsArray === "function") {
            callback = conditionsArray;
            conditionsArray = undefined;
            sort = undefined;
            limit = undefined;
        }

        if (typeof conditionsArray === "undefined") {
            conditionsArray = "__timestamp > 0";
        }

        if (typeof conditionsArray === "string") {
            conditionsArray = [conditionsArray];
        } else if (!Array.isArray(conditionsArray)) {
            return callback(Error(`Condition argument of filter function need to be string or array of strings`));
        }
        let Query = require("./Query");
        let query = new Query(conditionsArray);

        if (typeof sort === "function") {
            callback = sort;
            sort = undefined;
            limit = undefined;
        }

        if (typeof limit === "function") {
            callback = limit;
            limit = undefined;
        }

        if (typeof limit === "undefined") {
            limit = Infinity;
        }

        if (typeof sort === "undefined") {
            sort = "asc";
        }

        const indexName = query.getIndexName();

        this.addIndex(tableName, indexName, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to add index for fields ${indexName} in table ${tableName}`, err));
            }

            storageDSU.listFolders(getIndexPath(tableName, indexName), (err, values) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed read values for field ${indexName}`, err));
                }

                let filteredValues = query.filterValuesForIndex(values);
                query.sortValues(filteredValues, sort);
                const getNextRecordForValue = getNextRecordFunction(tableName, indexName)
                query.filter(filteredValues, getNextRecordForValue, limit, callback);
            });
        });
    }


    function getNextRecordFunction(tableName, fieldName) {
        let currentValue;
        let pksArray;
        let currentPosition;

        function getNext(callback) {
            if (currentPosition >= pksArray.length) {
                return callback(undefined, null);
            }

            self.getRecord(tableName, pksArray[currentPosition++], callback);
        }

        return function (value, callback) {
            if (value !== currentValue) {
                storageDSU.listFiles(getIndexPath(tableName, fieldName, value), (err, pks) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`No primary key found for value ${value}`, err));
                    }

                    pksArray = pks;
                    currentPosition = 0;
                    currentValue = value

                    getNext(callback);
                });
            } else {
                getNext(callback);
            }
        }

    }

    this.addIndex = function (tableName, fieldName, forceReindex, callback) {
        if (typeof forceReindex === "function") {
            callback = forceReindex;
            forceReindex = false;
        }

        if (typeof forceReindex === "undefined") {
            forceReindex = false;
        }

        if (forceReindex === false) {
            checkFieldIsIndexed(tableName, fieldName, (err, status) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to check if field ${fieldName} in table ${tableName} is indexed`, err));
                }

                if (status === true) {
                    return callback();
                }

                createIndex(tableName, fieldName, callback);
            });
        } else {
            createIndex(tableName, fieldName, callback);
        }
    }

    this.getIndexedFields = function (tableName, callback) {
        getIndexedFieldsList(tableName, callback);
    };

    function createIndex(tableName, fieldName, callback) {
        getPrimaryKeys(tableName, (err, primaryKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get primary keys for table ${tableName}`, err));
            }

            function createIndexFilesRecursively(index) {
                if (index === primaryKeys.length) {
                    return callback(undefined);
                }

                const pk = primaryKeys[index];
                self.getRecord(tableName, pk, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${pk} from table ${tableName}`));
                    }

                    storageDSU.writeFile(getIndexPath(tableName, fieldName, record[fieldName], pk), undefined, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
                        }

                        createIndexFilesRecursively(index + 1);
                    });
                });
            }

            if (primaryKeys.length === 0) {
                storageDSU.createFolder(getIndexPath(tableName, fieldName), (err) => {

                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create empty index for field ${fieldName} in table ${tableName}`, err));
                    }

                    callback(undefined)
                });
            } else {
                createIndexFilesRecursively(0);
            }
        });
    }

    function createIndexEntry(tableName, fieldName, pk, value, callback) {
        storageDSU.writeFile(getIndexPath(tableName, fieldName, value, pk), (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to create file ${getIndexPath(tableName, fieldName, value, pk)}`, err);
            }

            callback(retErr)
        });
    }

    function updateIndexesForRecord(tableName, pk, record, callback) {
        if (record.__deleted) {
            //deleted records don't need to be into indexes
            return callback();
        }
        const fields = Object.keys(record);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            function updateIndexesRecursively(index) {
                const field = fields[index];
                if (typeof field === "undefined") {
                    return callback();
                }
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    createIndexEntry(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        updateIndexesRecursively(index + 1);
                    });
                } else {
                    updateIndexesRecursively(index + 1);
                }
            }

            updateIndexesRecursively(0);
        });
    }

    // pk and value can be undefined and you get only the path to index of fieldName
    function getIndexPath(tableName, fieldName, value, pk) {
        let path = `/${dbName}/${tableName}/indexes/${fieldName}`;
        if (typeof value !== "undefined") {
            path = `${path}/${value}`;
        }

        if (typeof pk !== "undefined") {
            path = `${path}/${pk}`;
        }
        return path;
    }

    function getRecordPath(tableName, pk) {
        return `/${dbName}/${tableName}/records/${pk}`;
    }

    function deleteIndex(tableName, fieldName, pk, value, callback) {
        storageDSU.delete(getIndexPath(tableName, fieldName, value, pk), () => {
            //TODO handle error type
            //ignoring error on purpose
            callback(undefined);


        });
    }

    function deleteIndexesForRecord(tableName, pk, record, callback) {
        const fields = Object.keys(record);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            function deleteIndexesRecursively(index) {
                const field = fields[index];
                if (typeof field === "undefined") {
                    return callback();
                }
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    deleteIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to delete index for field ${field} in table ${tableName}`, err));
                        }

                        deleteIndexesRecursively(index + 1);
                    });
                } else {
                    deleteIndexesRecursively(index + 1);
                }
            }

            deleteIndexesRecursively(0);
        });
    }

    function getIndexedFieldsList(tableName, callback) {
        const indexesFilePath = `/${dbName}/${tableName}/indexes`;
        storageDSU.listFolders(indexesFilePath, (err, indexes) => {
            if (err) {
                return callback(undefined, []);
            }

            callback(undefined, indexes);
        });
    }

    /*
      Insert a record
    */
    this.insertRecord = function (tableName, key, record, callback) {
        this.updateRecord(tableName, key, record, undefined, callback);
    };

    function getPrimaryKeys(tableName, callback) {
        storageDSU.listFiles(`/${dbName}/${tableName}/records`, (err, primaryKeys) => {
            if (err) {
                return storageDSU.createFolder(`/${dbName}/${tableName}/records`, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to retrieve primary keys list in table ${tableName}`, err));
                    }
                    callback(undefined, []);
                });
            }

            callback(undefined, primaryKeys);
        });
    }

    /*
        Update a record
     */
    this.updateRecord = function (tableName, key, record, currentRecord, callback) {
        if (typeof record !== "object") {
            return callback(Error(`Invalid record type. Expected "object"`))
        }

        if (Buffer.isBuffer(record)) {
            return callback(Error(`"Buffer" is not a valid record type. Expected "object".`))
        }

        if (Array.isArray(record)) {
            this.writeKey(key, value, callback);
            return callback(Error(`"Array" is not a valid record type. Expected "object".`))
        }

        const recordPath = getRecordPath(tableName, key);
        storageDSU.writeFile(recordPath, JSON.stringify(record), function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to update record in ${recordPath}`, err));
            }

            if (typeof currentRecord !== "undefined") {
                return deleteIndexesForRecord(tableName, key, currentRecord, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(currentRecord)}`, err));
                    }

                    return updateIndexesForRecord(tableName, key, record, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${record}`, err));
                        }

                        callback(undefined, record);
                    });
                });
            }

            updateIndexesForRecord(tableName, key, record, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${record}`, err));
                }

                callback(undefined, record);
            });
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        const recordPath = getRecordPath(tableName, key);
        storageDSU.readFile(recordPath, function (err, res) {
            let record;
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to read record in ${recordPath}`, err);
            } else {
                try {
                    record = JSON.parse(res);
                } catch (newErr) {
                    retErr = createOpenDSUErrorWrapper(`Failed to parse record in ${recordPath}: ${res}`, retErr);
                }
            }
            callback(retErr, record);
        });
    };

    const READ_WRITE_KEY_TABLE = "KeyValueTable";
    this.writeKey = function (key, value, callback) {
        let valueObject = {
            type: typeof value,
            value: value
        };

        if (typeof value === "object") {
            if (Buffer.isBuffer(value)) {
                valueObject = {
                    type: "buffer",
                    value: value.toString()
                }
            } else {
                valueObject = {
                    type: "object",
                    value: JSON.stringify(value)
                }
            }
        }

        const recordPath = getRecordPath(READ_WRITE_KEY_TABLE, key);
        storageDSU.writeFile(recordPath, JSON.stringify(valueObject), callback);
    };

    this.readKey = function (key, callback) {
        this.getRecord(READ_WRITE_KEY_TABLE, key, (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read key ${key}`, err));
            }

            let value;
            switch (record.type) {
                case "buffer":
                    value = Buffer.from(record.value);
                    break;
                case "object":
                    value = JSON.parse(record.value);
                    break;
                default:
                    value = record.value;
            }

            callback(undefined, value);
        });
    }
}

module.exports.SingleDSUStorageStrategy = SingleDSUStorageStrategy;
},{"../../utils/ObservableMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/ObservableMixin.js","./Query":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/storageStrategies/Query.js","swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dc/index.js":[function(require,module,exports){
/*
html API space
*/
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/AppBuilderService.js":[function(require,module,exports){
/**
 * @module dt
 */

/**
 *
 */
const FileService = require("./FileService");

const DSU_SPECIFIC_FILES = ["dsu-metadata.log", "manifest"]
const {_getResolver, _getKeySSISpace} = require('./commands/utils');

/**
 * Default Options set for the {@link AppBuilderService}
 * <pre>
 *     {
            anchoring: "default",
            publicSecretsKey: '-$Identity-',
            environmentKey: "-$Environment-",
            basePath: "",
            stripBasePathOnInstall: false,
            walletPath: "",
            hosts: "",
            hint: undefined,
            vault: "vault",
            seedFileName: "seed",
            appsFolderName: "apps",
            appFolderName: "app",
            codeFolderName: "code",
            initFile: "init.file",
            environment: {},
            slots:{
                primary: "wallet-patch",
                secondary: "apps-patch"
            }
        }
 * </pre>
 */
const OPTIONS = {
    anchoring: "default",
    publicSecretsKey: '-$Identity-',
    environmentKey: "-$Environment-",
    basePath: "",
    stripBasePathOnInstall: false,
    walletPath: "",
    hosts: "",
    hint: undefined,
    vault: "vault",
    seedFileName: "seed",
    appsFolderName: "apps",
    appFolderName: "app",
    codeFolderName: "code",
    initFile: "init.file",
    environment: {},
    slots:{
        primary: "wallet-patch",
        secondary: "apps-patch"
    }
}

/**
 * Convert the Environment object into the Options object
 */
const envToOptions = function(env, opts){
    let options = Object.assign({}, OPTIONS, opts);
    options.environment = env;
    options.vault = env.vault;
    options.anchoring = env.domain;
    options.basePath = env.basePath;
    options.walletPath = env.basePath.split('/').reduce((sum, s) => sum === '' && s !== '/' ? s : sum, '');
    const opendsu = require('opendsu');
    options.hosts = $$.environmentType === 'browser'
        ? `${opendsu.loadApi('system').getEnvironmentVariable(opendsu.constants.BDNS_ROOT_HOSTS)}`
        : `localhost:8080`;
    return options;
}

/**
 *
 * @param {object} environment typically comes from an environment.js file is the ssapps. Overrides some options
 * @param {object} [opts] options object mimicking {@link OPTIONS}
 */
function AppBuilderService(environment, opts) {
    const options = envToOptions(environment, opts);
    const dossierBuilder = new (require("./DossierBuilder"))();

    const fileService = new FileService(options);

    /**
     * Lists a DSUs content
     * @param {KeySSI} keySSI
     * @param {function(err, files, mounts)} callback
     * @private
     */
    const getDSUContent = function (keySSI, callback) {
        _getResolver().loadDSU(keySSI, (err, dsu) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not load DSU with SSI ${keySSI}`, err));
            dsu.listFiles("/", {ignoreMounts: true}, (err, files) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not retrieve DSU content`, err));
                dsu.listMountedDSUs("/", (err, mounts) => {
                    if (err)
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not retrieve DSU mounts`, err));
                    callback(undefined, files.filter(f => {
                        return DSU_SPECIFIC_FILES.indexOf(f) === -1;
                    }), mounts, dsu);
                });
            });
        });
    }

    /**
     * Creates an Arrays SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {string[]} secrets
     * @param {function(err, ArraySSI)} callback
     * @private
     */
    const createArraySSI = function(secrets, callback){
        const key = _getKeySSISpace().createArraySSI(options.anchoring, secrets, 'v0', options.hint ? JSON.stringify(options.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Creates a Wallet SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {string[]} secrets
     * @param {function(err, ArraySSI)} callback
     */
    const createWalletSSI = function(secrets, callback){
        const key = _getKeySSISpace().createTemplateWalletSSI(options.anchoring, secrets, 'v0', options.hint ? JSON.stringify(options.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Creates an Arrays SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {string} specificString
     * @param {function(err, TemplateSeedSSI)} callback
     */
    const createSSI = function(specificString, callback){
        const key = _getKeySSISpace().createTemplateSeedSSI(options.anchoring, specificString, undefined, 'v0', options.hint ? JSON.stringify(options.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Creates a DSU of an ArraySSI
     * @param {string[]} secrets
     * @param {object} opts DSU Creation Options
     * @param {function(err, Archive)} callback
     */
    const createWalletDSU = function(secrets, opts, callback){
        createWalletSSI(secrets, (err, keySSI) => {
            _getResolver().createDSUForExistingSSI(keySSI, opts, (err, dsu) => {
                if (err)
                    return callback(`Could not create const DSU ${err}`);
                callback(undefined, dsu);
            });
        });
    }

    /**
     * Creates a DSU of an ArraySSI
     * @param {string} specific String for Seed SSI
     * @param {object} opts DSU Creation Options
     * @param {function(err, Archive)} callback
     */
    const createDSU = function(specific, opts, callback){
        createSSI(specific, (err, keySSI) => {
            _getResolver().createDSU(keySSI, opts, (err, dsu) => {
                if (err)
                    return callback(`Could not create const DSU ${err}`);
                callback(undefined, dsu);
            });
        });
    }

    /**
     * Creates a DSU of an ArraySSI
     * @param {string[]} secrets
     * @param {object} opts DSU Creation Options
     * @param {function(err, Archive)} callback
     */
    const createConstDSU = function(secrets,opts , callback){
        createArraySSI(secrets, (err, keySSI) => {
            _getResolver().createDSUForExistingSSI(keySSI, opts, (err, dsu) => {
                if (err)
                    return callback(`Could not create const DSU ${err}`);
                callback(undefined, dsu);
            });
        });
    }

    const getDSUFactory = function(isConst, isWallet){
        return isConst ? (isWallet ? createWalletDSU : createConstDSU) : createDSU;
    }

    /**
     * Creates a new DSU (Const or not) and clones the content another DSU into it
     * @param {object|string} arg can be a secrets object or a string depending on if it's a const DSU or not. A secrets object is like:
     * <pre>
     *     {
     *         secretName: {
     *             secret: "...",
     *             public: (defaults to false. If true will be made available to the created DSU for use of initialization Scripts)
     *         },
     *         (...)
     *     }
     * </pre>
     * @param {KeySSI} keyForDSUToClone
     * @param {boolean} [isConst] decides if the Created DSU is Const or not. defaults to true
     * @param {function(err, KeySSI)} callback
     */
    this.clone = function (arg, keyForDSUToClone, isConst, callback) {
        if (typeof isConst === 'function'){
            callback = isConst;
            isConst = true;
        }
        parseSecrets(true, arg, (err, keyGenArgs, publicSecrets) => {
            if (err)
                return callback(err);
            getDSUContent(keyForDSUToClone, (err, files, mounts, dsuToClone) => {
                if (err)
                    return callback(err);
                console.log(`Loaded Template DSU with key ${keyForDSUToClone}:\nmounts: ${mounts}`);
                getDSUFactory(isConst)(keyGenArgs, (err, destinationDSU) => {
                    if (err)
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
                    doClone(dsuToClone, destinationDSU, files, mounts,  publicSecrets,(err, keySSI) => {
                        if (err)
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
                        console.log(`DSU ${keySSI} as a clone of ${keyForDSUToClone} was created`);
                        // if (publicSecrets)
                        //     return writeToCfg(destinationDSU, publicSecrets, err => callback(err, keySSI));
                        callback(undefined, keySSI);
                    });
                });
            });
        });
    }

    const _getPatchContent = function(appName, callback){
        fileService.getFolderContentAsJSON(appName, (err, content) => {
           if (err)
               return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not retrieve patch content for ${appName}`, err));
           try {
               content = JSON.parse(content);
           } catch (e) {
               return callback(`Could not parse content`);
           }
            content['/'][options.seedFileName] = undefined;
            delete content['/'][options.seedFileName];

           callback(undefined, content);
        });
    }

    const filesToCommands = (content) => {
        let commands = [];
        for (let directory in content)
            if (content.hasOwnProperty(directory)){
                let directoryFiles = content[directory];
                for (let fileName in directoryFiles)
                    if (directoryFiles.hasOwnProperty(fileName))
                        commands.push(`createfile ${directory}/${fileName} ${directoryFiles[fileName]}`);
            }
        return commands;
    }

    /**
     * Copies the patch files from the path folder onto the DSU
     * @param {Archive} dsu
     * @param {string} slotPath should be '{@link OPTIONS.slots}[/appName]' when appName is required
     * @param {function(err, Archive, KeySSI)} callback
     */
    const patch = function(dsu, slotPath, callback) {
        // Copy any files found in the RESPECTIVE PATCH FOLDER on the local file system
        // into the app's folder
        _getPatchContent(slotPath, (err, files) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
            let commands = filesToCommands(files);
            if (commands.length === 0){
                console.log(`Application ${slotPath} does not require patching`);
                return callback(undefined, dsu);
            }

            dossierBuilder.buildDossier(dsu, commands, (err, keySSI) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
                console.log(`Application ${slotPath} successfully patched`);
                callback(undefined, dsu, keySSI);
            });
        });
    }

    /**
     * When writing the env to an SSApp, because she'll run in an iFrame,
     * its basePath will always be '/' unlike the loader, we have the option to strip the base path id that's desirable
     * @param {object} env
     */
    const resetBasePath = function(env){
        if (!env.stripBasePathOnInstall)
            return env;
        return Object.assign({}, env, {basePath: '/'});
    }

    /**
     * Reads from {@link OPTIONS.initFile} and executes the commands founds there via {@link DossierBuilder#buildDossier}
     * @param {Archive} instance
     * @param {object} publicSecrets what elements of the registration elements should be passed onto the SSApp
     * @param {function(err, Archive)} callback
     */
    const initializeInstance = function(instance, publicSecrets, callback){
        instance.readFile(`${options.codeFolderName}/${options.initFile}`, (err, data) => {
            if (err) {
                console.log(`No init file found. Initialization complete`);
                return callback(undefined, instance);
            }

            // embed the environment and identity into in the initializations commands
            let commands = data.toString().replace(options.environmentKey, JSON.stringify(resetBasePath(options.environment)));
            commands = (publicSecrets
                    ? commands.replace(options.publicSecretsKey, JSON.stringify(publicSecrets))
                    : commands)
                .split(/\r?\n/).map(cmd => cmd.trim()).filter(cmd => !!cmd && !cmd.startsWith('##'));

            dossierBuilder.buildDossier(instance, commands, (err, keySSI) => {
                if (err)
                   return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not initialize SSApp instance`, err));
                console.log(`Instance successfully initialized: ${keySSI}`);
                callback(undefined, instance);
            });
        });
    }

    /**
     * Parser the secrets object according to if its a wallet or not
     * @param {boolean} isWallet
     * @param {object|string} secrets can be a secrets object or a string depending on if it's a wallet or not. A secrets object is like:
     * <pre>
     *     {
     *         secretName: {
     *             secret: "...",
     *             public: (defaults to false. If true will be made available to the created DSU for use of initialization Scripts)
     *         },
     *         (...)
     *     }
     * </pre>
     * @param {function(err, string|string[], publicSecrets)} callback
     */
    const parseSecrets = function(isWallet, secrets, callback){
        let specificArg = secrets;
        let publicSecrets = undefined;
        if (isWallet && typeof secrets === 'object'){
            specificArg = [];
            publicSecrets = {};
            Object.entries(secrets).forEach(e => {
                if (e[1].public)
                    publicSecrets[e[0]] = e[1].secret;
                specificArg.push(e[1].secret);
            });
        }
        callback(undefined, specificArg, publicSecrets);
    }

    this.parseSecrets = parseSecrets;

    /**
     * Builds an SSApp
     * @param {boolean} isWallet
     * @param {object|string} secrets according to {@link parseSecrets}
     * @param {string} seed
     * @param {string} [name]
     * @param {function(err, KeySSI, Archive)} callback
     */
    const buildApp = function(isWallet, secrets, seed, name, callback){
        if (typeof name === 'function'){
            if (!isWallet)
                return callback(`No SSApp name provided`);
            callback = name;
            name = undefined;
        }

        const patchAndInitialize = function(instance, publicSecrets, callback){
            const patchPath = isWallet ? `${options.slots.primary}` : `${options.slots.secondary}/${name}`;
            patch(instance, patchPath, (err) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Error patching SSApp ${name}`, err));
                initializeInstance(instance, publicSecrets, (err) => {
                    if (err)
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
                    instance.getKeySSIAsString((err, keySSI) => {
                        if (err)
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
                        callback(undefined, keySSI);
                    });
                });
            });
        }

        parseSecrets(isWallet, secrets, (err, keyArgs, publicSecrets) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
            getDSUFactory(isWallet, isWallet)(keyArgs, isWallet ? {dsuTypeSSI: seed} : undefined, (err, wallet) => {
                if (err)
                    return callback(`Could not create instance`);

                const instance = isWallet ? wallet.getWritableDSU() : wallet;

                if (isWallet)
                    return patchAndInitialize(instance, publicSecrets, (err, key) => callback(err, key, wallet));

                instance.mount(`${options.codeFolderName}`, seed, (err) => {
                    if (err)
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not mount Application code in instance`, err));
                    patchAndInitialize(instance, publicSecrets, (err, key) => callback(err, key, wallet));
                });
            });
        });
    }

    /**
     * Retrieves the list of Applications to be installed
     * @param {function(err, object)} callback
     */
    const getListOfAppsForInstallation = (callback) => {
        fileService.getFolderContentAsJSON(options.slots.secondary, function (err, data) {
            if (err){
                console.log(`No Apps found`)
                return callback(undefined, {});
            }

            let apps;

            try {
                apps = JSON.parse(data);
            } catch (e) {
                return callback(`Could not parse App list`);
            }

            callback(undefined, apps);
        });
    };

    /**
     * Installs all aps in the apps folder in the wallet
     * @param {Archive} wallet
     * @param {function(err, object)} callback returns the apps details
     */
    const installApps = function(wallet, callback){
        const performInstallation = function(wallet, apps, appList, callback){
            if (!appList.length)
                return callback();
            let appName = appList.pop();
            const appInfo = apps[appName];

            if (appName[0] === '/')
                appName = appName.replace('/', '');

            const mountApp = (newAppSeed) => {
                wallet.mount(`/${options.appsFolderName}/${appName}`, newAppSeed, (err) => {
                    if (err)
                        return callback("Failed to mount in folder" + `/apps/${appName}: ${err}`);

                    performInstallation(wallet, apps, appList, callback);
                });
            };

            // If new instance is not demanded just mount (leftover code from privatesky.. when is it not a new instance?)
            if (appInfo.newInstance === false)
                return mountApp(appInfo.seed);

            buildApp(false, undefined, appInfo.seed, appName, (err, keySSI) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to build app ${appName}`, err));
                mountApp(keySSI);
            });
        }

        getListOfAppsForInstallation((err, apps) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper( err));
            apps = apps || {};
            let appList = Object.keys(apps).filter(n => n !== '/');
            if(!appList.length)
                return callback(undefined, appList);
            let tempList = [...appList]
            performInstallation(wallet, apps, tempList, (err) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not complete installations`, err));
                callback(undefined, appList);
            });
        });
    }

    /**
     * Builds a new SSApp from the provided secrets
     * @param {KeySSI} seed the SSApp's keySSI
     * @param {string} name the SSApp's name
     * @param {function(err, KeySSI, Archive)} callback
     */
    this.buildSSApp = function(seed, name, callback){
        return buildApp(false, seed, name, callback);
    }

    /**
     * Builds a new Wallet from the provided secrets
     * @param {object|string} secrets according to {@link parseSecrets}
     * @param {function(err, KeySSI, Archive)} callback
     */
    this.buildWallet = function(secrets, callback){
        fileService.getWalletSeed((err, seed) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Could not retrieve template wallet SSI.", err));
            buildApp(true, secrets, seed, (err, keySSI, wallet) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not build wallet`, err));
                console.log(`Wallet built with SSI ${keySSI}`);
                installApps(wallet, (err, appList) => {
                    if (err)
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not Install Applications ${JSON.stringify(appList)}`, err));
                    if (appList.length)
                        console.log(`Applications installed successfully`);
                    callback(undefined, keySSI, wallet);
                })
            });
        });
    }

    this.loadWallet = function(secrets, callback){
        parseSecrets(true, secrets, (err, keyGenArgs, publicSecrets) => {
            if (err)
                return callback(err);
            createWalletSSI(keyGenArgs, (err, keySSI) => {
                if (err)
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Could not create wallet with ssi ${{keySSI}}`, err));
                console.log(`Loading wallet with ssi ${keySSI.getIdentifier()}`);
                _getResolver().loadDSU(keySSI, (err, wallet) => {
                    if (err)
                        return callback(`Could not load wallet DSU ${err}`);
                    wallet = wallet.getWritableDSU();
                    console.log(`wallet Loaded`);
                    wallet.getKeySSIAsString(callback);
                });
            });
        });
    }
}
module.exports = AppBuilderService;
},{"./DossierBuilder":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/DossierBuilder.js","./FileService":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/FileService.js","./commands/utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/DossierBuilder.js":[function(require,module,exports){
/**
 * @module dt
 */

const {_getByName } = require('./commands');
const {_getResolver, _getKeySSISpace} = require('./commands/utils');

/**
 * Automates the Dossier Building process
 * Call via
 * <pre>
 *     builder.buildDossier(config, commands, callback)
 * </pre>
 * where the config is as follows (this config is generated by the buildDossier script in octopus given the proper commands):
 * <pre>
 *     {
 *          "seed": "./seed",
 *          "domain": "default",
 *     }
 * </pre>
 *
 * For a Simple SSApp (with only mounting of cardinal/themes and creation of code folder) the commands would be like:
 * <pre>
 *     delete /
 *     addfolder code
 *     mount ../cardinal/seed /cardinal
 *     mount ../themes/'*'/seed /themes/'*'
 * </pre>
 * @param {Archive} [sourceDSU] if provided will perform all OPERATIONS from the sourceDSU as source and not the fs
 * @param {VarStore} [varStore]
 */
const DossierBuilder = function(sourceDSU, varStore){

    const _varStore = varStore || new (require('./commands/VarStore'))();

    let createDossier = function (conf, commands, callback) {
        console.log("creating a new dossier...")
        _getResolver().createDSU(_getKeySSISpace().createTemplateSeedSSI(conf.domain), (err, bar) => {
            if (err)
                return callback(err);
            updateDossier(bar, conf, commands, callback);
        });
    };

    /**
     * Writes to a file on the filesystem
     * @param filePath
     * @param data
     * @param callback
     */
    const writeFile = function(filePath, data, callback){
        new (_getByName('createfile'))(_varStore).execute([filePath, data], (err) => err
            ? callback(err)
            : callback(undefined, data));
    }

    /**
     * Reads a file from the filesystem
     * @param filePath
     * @param callback
     */
    const readFile = function(filePath, callback){
        new (_getByName('readfile'))(_varStore).execute(filePath, callback);
    }

    /**
     * Stores the keySSI to the SEED file when no sourceDSU is provided
     * @param {string} seed_path the path to store in
     * @param {string} keySSI
     * @param {function(err, KeySSI)} callback
     */
    let storeKeySSI = function (seed_path, keySSI, callback) {
        writeFile(seed_path, keySSI, callback);
    };

    /**
     * Runs an operation
     * @param {Archive} bar
     * @param {string|string[]} command
     * @param {string[]} next the remaining commands to be executed
     * @param {function(err, Archive)} callback
     */
    let runCommand = function(bar, command, next, callback){
        let args = command.split(/\s+/);
        const cmdName = args.shift();
        const cmd = _getByName(cmdName);
        return cmd
            ? new (cmd)(_varStore, this.source).execute(args, bar, next, callback)
            : callback(`Command not recognized: ${cmdName}`);
    };

    /**
     * Retrieves the KeysSSi after save (when applicable)
     * @param {Archive} bar
     * @param {object} cfg is no sourceDSU is provided must contain a seed field
     * @param {function(err, KeySSI)} callback
     */
    let saveDSU = function(bar, cfg, callback){
        bar.getKeySSIAsString((err, barKeySSI) => {
            if (err)
                return callback(err);
            if(sourceDSU || cfg.skipFsWrite)
                return callback(undefined, barKeySSI);
            storeKeySSI(cfg.seed, barKeySSI, callback);
        });
    };

    /**
     * Run a sequence of {@link Command}s on the DSU
     * @param {Archive} bar
     * @param {object} cfg
     * @param {string[]} commands
     * @param {function(err, KeySSI)} callback
     */
    let updateDossier = function(bar, cfg, commands, callback) {
        if (commands.length === 0)
            return saveDSU(bar, cfg, callback);
        let cmd = commands.shift();
        runCommand(bar, cmd, commands,(err, updated_bar) => {
            if (err)
                return callback(err);
            updateDossier(updated_bar, cfg, commands, callback);
        });
    };

    /**
     * Builds s DSU according to it's building instructions
     * @param {object|Archive} configOrDSU: can be a config file form octopus or the destination DSU when cloning.
     *
     *
     * Example of config file:
     * <pre>
     *     {
     *         seed: path to SEED file in fs
     *     }
     * </pre>
     * @param {string[]|object[]} [commands]
     * @param {function(err, KeySSI)} callback
     */
    this.buildDossier = function(configOrDSU, commands, callback){
        if (typeof commands === 'function'){
            callback = commands;
            commands = [];
        }

        let builder = function(keySSI){
            try {
                keySSI = _getKeySSISpace().parse(keySSI);
            } catch (err) {
                console.log("Invalid keySSI");
                return createDossier(configOrDSU, commands, callback);
            }

            if (keySSI.getDLDomain() !== configOrDSU.domain) {
                console.log("Domain change detected.");
                return createDossier(configOrDSU, commands, callback);
            }

            _getResolver().loadDSU(keySSI, (err, bar) => {
                if (err){
                    console.log("DSU not available. Creating a new DSU for", keySSI.getIdentifier());
                    return _getResolver().createDSU(keySSI, {useSSIAsIdentifier: true}, (err, bar)=>{
                        if(err)
                            return callback(err);
                        updateDossier(bar, configOrDSU, commands, callback);
                    });
                }
                console.log("Dossier updating...");
                updateDossier(bar, configOrDSU, commands, callback);
            });
        }

        if (configOrDSU.constructor && configOrDSU.constructor.name === 'Archive')
            return updateDossier(configOrDSU, {skipFsWrite: true}, commands, callback);

        readFile(configOrDSU.seed, (err, content) => {
            if (err || content.length === 0)
                return createDossier(configOrDSU, commands, callback);
            builder(content.toString());
        });
    };
};

module.exports = DossierBuilder;

},{"./commands":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/index.js","./commands/VarStore":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/VarStore.js","./commands/utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/FileService.js":[function(require,module,exports){
/**
 * @module dt
 */

/**
 * Forked from PrivateSky
 * Provides an environment independent file service to the {@link AppBuilderService}
 */
function FileService(options) {
    const isBrowser = $$.environmentType === 'browser';

    function constructUrlBase(prefix){
        let url, protocol, host;
        prefix = prefix || "";
        let appName = '';
        if (isBrowser){
            let location = window.location;
            const paths = location.pathname.split("/");
            while (paths.length > 0) {
                if (paths[0] === "") {
                    paths.shift();
                } else {
                    break;
                }
            }
            appName = paths[0];
            protocol = location.protocol;
            host = location.host;
            url = `${protocol}//${host}/${prefix}${appName}`;
            return url;
        } else {
            return `http://${options.hosts}/${prefix}${options.walletPath}`;
        }
    }

    this.getWalletSeed = function(callback){
        this.getAppSeed(options.slots.primary, callback);
    }

    this.getAppSeed = function(appName, callback){
        this.getFile(appName, options.seedFileName, (err, data) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(err));
           Utf8ArrayToStr(data, callback);
        });
    }

    function doGet(url, options, callback){
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        const http = require("opendsu").loadApi("http");
        http.fetch(url, {
            method: 'GET'
        }).then((response) => {
            return response.arrayBuffer().then((data) => {
                if (!response.ok)
                    return callback("array data failed")
                callback(undefined, data);
            }).catch(e => callback(e));
        }).catch(err => callback(err));
    }

    /**
     * Returns the content of a file as a uintArray
     * @param {string} appName
     * @param {string} fileName
     * @param {function(err, U8intArray)} callback
     */
    this.getFile = function(appName, fileName, callback){
        const suffix = `${appName}/${fileName}`;
        const base = constructUrlBase();
        const joiner = suffix !== '/' && base[base.length - 1] !== '/' && suffix[0] !== '/'
            ? '/'
            : '';

        let url = base + joiner + suffix;
        doGet(url, callback);
    };


    /**
     *
     * @param innerFolder
     * @param callback
     */
    this.getFolderContentAsJSON = function(innerFolder, callback){
        if (typeof innerFolder === 'function'){
            callback = innerFolder;
            innerFolder = undefined;
        }
        let url = constructUrlBase("directory-summary/") + (innerFolder ? `/${innerFolder}` : '') ;
        doGet(url, (err, data) => {
            if (err)
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(err));
            Utf8ArrayToStr(data, callback);
        });
    }

    /**
     * Util method to convert Utf8Arrays to Strings in the browser
     * (simpler methods fail for big content jsons)
     * @param {U8intArray} array
     * @param {function(err, string)} callback
     */
    function Utf8ArrayToStr(array, callback) {
        if (!isBrowser)
            return callback(undefined, array.toString());
        var bb = new Blob([array]);
        var f = new FileReader();
        f.onload = function(e) {
            callback(undefined, e.target.result);
        };
        f.readAsText(bb);
    }
}

module.exports = FileService;
},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */
const { _err } = require('./utils');

/**
 * **Every Command must be registered under the index.js file in the commands folder**
 * @param {VarStore} varStore
 * @param {Archive|fs} [source]
 * @param {boolean} [canRunIteratively] defines if the command can expect multiple arguments and run multiple times. defaults to false
 * @class Command
 * @abstract
 */
class Command {
    constructor(varStore, source, canRunIteratively) {
        if (typeof source === 'boolean'){
            canRunIteratively = source;
            source = undefined;
        }
        if (!varStore.checkVariables)
            throw new Error('Cant happen')

        this.varStore = varStore;
        this.source = source;
        this.canRunIteratively = !!canRunIteratively;
    }

    /**
     * Parses the command text and executes the command onto the provided DSU
     * @param {string[]|string} args the arguments of the command split into words
     * @param {Archive|KeySSI} [bar] the destinationDSU or the keySSI
     * @param {string[]} [next] the remaining commands
     * @param {object} [options]
     * @param {function(err, Archive|KeySSI|string|boolean)} callback
     */
    execute(args,bar, next, options, callback){
        if (typeof options === 'function'){
            callback = options;
            options = undefined;
        }
        if (typeof next === 'function'){
            callback = next;
            options = undefined;
            next = undefined;
        }
        if (callback === undefined){
            callback = bar;
            bar = undefined;
        }
        let self = this;
        this._parseCommand(args, next, (err, parsedArgs) => {
            if (err)
                return _err(`Could not parse command ${args}`, err, callback);

            // Tests against variables
            if (self.varStore)
                parsedArgs = self.varStore.checkVariables(parsedArgs);

            if (!self.canRunIteratively || !(parsedArgs instanceof Array))
                return self._runCommand(parsedArgs, bar, options, callback);

            const iterator = function(args, callback){
                let arg = parsedArgs.shift();
                if (!arg)
                    return callback(undefined, bar);
                return self._runCommand(arg, bar, options, (err, dsu) => err
                    ? _err(`Could iterate over Command ${self.constructor.name} with args ${JSON.stringify(arg)}`, err, callback)
                    : iterator(args, callback));
            }

            iterator(args, callback);
        });
    }

    /**
     * Should be overridden by child classes if any argument parsing is required
     *
     * @param {string[]|string|boolean} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|string[]|object)} callback
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command);
    }

    /**
     * @param {string|object} arg the command argument
     * @param {Archive} [bar]
     * @param {object} options
     * @param {function(err, Archive|KeySSI|string)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        throw new Error("Child classes must implement this");
    }
}

module.exports = Command;
},{"./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Registry.js":[function(require,module,exports){
/**
 * List of all available commands to the Dossier Builder
 * Without being here, they can't be used
 */
const _availableCommands = {
    addfile: require('./addFile'),
    addfolder: require('./addFolder'),
    createdsu: require('./createDSU'),
    createfile: require('./createFile'),
    define: require('./define'),
    delete: require('./delete'),
    derive: require('./derive'),
    endwith: require('./endWith'),
    genkey: require('./genKey'),
    getidentifier: require('./getIndentifier'),
    mount: require('./mount'),
    objtoarray: require('./objToArray'),
    readfile: require('./readFile'),
    with: require('./with')
};

/**
 * return the Command class by its name
 * @param cmdName
 * @return {Command} the command calls to be instanced
 */
const _getByName = function(cmdName){
    if (cmdName in _availableCommands)
        return _availableCommands[cmdName];
    return undefined;
}

module.exports = _getByName;
},{"./addFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFile.js","./addFolder":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFolder.js","./createDSU":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createDSU.js","./createFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createFile.js","./define":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/define.js","./delete":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/delete.js","./derive":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/derive.js","./endWith":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/endWith.js","./genKey":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/genKey.js","./getIndentifier":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/getIndentifier.js","./mount":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/mount.js","./objToArray":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/objToArray.js","./readFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/readFile.js","./with":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/with.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/VarStore.js":[function(require,module,exports){
/**
 * @module commands
 * A simple variable store
 */


const VarStore = function(){
    const _memory = {};
    let _hasVars = false;
    const self = this;

    this.define = function(name, value){
        _memory[name] = value;
        _hasVars = true;
        console.log(`Variable ${name} defined as ${value}`)
    }

    const tryReplace = function(value){
        for (let name in _memory)
            if (value.includes(name)) {
                value = value.replace(name, _memory[name]);
                console.log(`Replaced variable ${name}`)
            }
        return value;
    }

    this.checkVariables = function(args){
        if (!_hasVars)
            return args;
        if (typeof args === 'string')
            return tryReplace(args);
        if (args instanceof Array)
            return args.map(a => self.checkVariables(a));
        if (typeof args !== 'object')
            return args;
        const result = {};
        Object.keys(args).forEach(k => {
            result[k] = self.checkVariables(args[k]);
        });
        return result;
    }
}

module.exports = VarStore;
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFile.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * Copies a File from disk or from a source DSU when provided
 *
 * supports sourceDSU, defaults to fs
 *
 * Can run iteratively
 *
 * @class AddFileCommand
 */
class AddFileCommand extends Command{
    constructor(varStore, source) {
        super(varStore, source, true);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next discarded
     * @param {function(err, string|object)} [callback] discarded
     * @return {string|object} the command argument
     * <pre>
     *     {
     *         from: (...),
     *         to: (..)
     *     }
     * </pre>
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, {
            "from": command[0],
            "to": command[1]
        });
    }

    /**
     * Copies a file, from disk or another DSU
     * @param {object} arg
     * <pre>
     *     {
     *         from: (...),
     *         to: (..)
     *     }
     * </pre>
     * @param {Archive} bar
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (!callback) {
            callback = options;
            options = undefined;
        }

        options = options || {encrypt: true, ignoreMounts: false}
        console.log("Copying file " + arg.from + (this.source ? " from sourceDSU" : "") + " to " + arg.to);

        if (!this.source)
            return bar.addFile(arg.from, arg.to, options, err => err
                ? _err(`Could not read from ${arg.from}`, err, callback)
                : callback(undefined, bar));

        this.source.readFile(arg.from, (err, data) => {
            if (err)
                return _err(`Could not read from ${arg.from}`, err, callback);
            bar.writeFile(arg.to, data, err => err
                ? _err(`Could not write to ${arg.to}`, err, callback)
                : callback(undefined, bar));
        });
    }
}

module.exports = AddFileCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFolder.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * This command copies an entire folder from the filesystem onto the destination DSU
 * (as a single brick for efficiency if I'm not mistaken)
 *
 * Does not Support sourceDSU (yet)
 *
 * Can run iteratively
 *
 * @class AddFolderCommand
 */
class AddFolderCommand extends Command {
    constructor(varStore, source) {
        super(varStore, source, false);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command[0]);
    }

    /**
     * @param {string|object} arg the command argument
     * @param {Archive} bar
     * @param {object} [options]
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        if (this.source){
            console.log("The addFolder Method is not supported when reading from a sourceDSU");
            callback(undefined, bar);
        }
        if (!callback) {
            callback = options;
            options = undefined;
        }

        options = options || {batch: false, encrypt: false};
        console.log("Adding Folder " + '/' + arg)
        bar.addFolder(arg, '/', options, err => err
            ? _err(`Could not add folder at '${'/' + arg}'`, err, callback)
            : callback(undefined, bar));
    }
}

module.exports = AddFolderCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createDSU.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err, _getResolver, DSU_TYPE, KEY_TYPE } = require('./utils');
const genKey = require('./genKey');

/**
 * @param {DSU_TYPE} dsuType
 * @return {KEY_TYPE}
 */
const _getKeyType = function(dsuType){
    switch (dsuType){
        case DSU_TYPE.CONST:
            return KEY_TYPE.ARRAY;
        case DSU_TYPE.WALLET:
            return KEY_TYPE.WALLET;
        case DSU_TYPE.SEED:
            return KEY_TYPE.SEED;
        default:
            throw new Error(`Unsupported DSU Type`);
    }
}


/**
 * Creates an Arrays SSI off a secret list
 *
 * Adds options.hint to hit if available
 * @param {string[]} arg
 * @param {function(err, KeySSI)} callback
 */
_createSSI = function(varStore, arg, callback){
    const argToArray = (arg) => {
        return `${arg.type} ${arg.domain} ${typeof arg.args === 'string' ? arg.args : JSON.stringify(arg.hint ? {
            hint: arg.hint,
            args: arg.args
        } : arg.args)}`.split(/\s+/);
    }
    new genKey(varStore).execute(argToArray(arg), callback);
}


/**
 * Creates a DSU of an ArraySSI
 * @param {string[]} arg
 * @param {object} opts DSU Creation Options
 * @param {function(err, Archive)} callback
 */
_createWalletDSU = function(varStore, arg, opts, callback){
    _createSSI(varStore, arg, (err, keySSI) => {
        _getResolver().createDSUForExistingSSI(keySSI, opts, (err, dsu) => {
            if (err)
                return _err(`Could not create wallet DSU`, err, callback);
            callback(undefined, dsu);
        });
    });
}

/**
 * Creates a DSU of an ArraySSI
 * @param {string[]} arg String for Seed SSI
 * @param {object} opts DSU Creation Options
 * @param {function(err, Archive)} callback
 */
_createDSU = function(varStore, arg, opts, callback){
    _createSSI(varStore, arg, (err, keySSI) => {
        _getResolver().createDSU(keySSI, opts, (err, dsu) => {
            if (err)
                return _err(`Could not create DSU`, err, callback);
            callback(undefined, dsu);
        });
    });
}

/**
 * Creates a DSU of an ArraySSI
 * @param {string[]} arg
 * @param {object} opts DSU Creation Options
 * @param {function(err, Archive)} callback
 */
_createConstDSU = function(varStore, arg,opts , callback){
    _createSSI(varStore, arg, (err, keySSI) => {
        _getResolver().createDSUForExistingSSI(keySSI, opts, (err, dsu) => {
            if (err)
                return _err(`Could not create const DSU`, err, callback);
            callback(undefined, dsu);
        });
    });
}

_getDSUFactory = function(isConst, isWallet){
    return isConst ? (isWallet ? _createWalletDSU : _createConstDSU) : _createDSU;
}

/**
 * creates a new DSU of the provided type and with the provided key gen arguments
 *
 * @class CreateDSUCommand
 */
class CreateDSUCommand extends Command{
    constructor(varStore, source) {
        super(varStore, source, false);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next discarded
     * @param {function(err, string|object)} [callback] discarded
     * @return {string|object} the command argument
     * <pre>
     *     {
     *         type: (...),
     *         domain: (..)
     *         args: {string[]|object},
     *     }
     * </pre>
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        try {
            let arg = {
                dsuType: command.shift(),
                domain: command.shift(),
                args: command.length === 1 ? command[0] : JSON.parse(command.join(' '))
            }
            arg.type = _getKeyType(arg.dsuType);
            if (typeof arg.args === 'object' && arg.args.args){
                arg.hint = arg.args.hint;
                arg.args = arg.args.args;
            }
            callback(undefined, arg)
        } catch (e){
            _err(`could not parse json ${command}`, e, callback);
        }
    }

    /**
     * Copies a file, from disk or another DSU
     * @param {object} arg
     * <pre>
     *     {
     *         from: (...),
     *         to: (..)
     *     }
     * </pre>
     * @param {Archive} bar
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if(!callback){
            callback = options;
            options = bar;
            bar = undefined;
        }
        if (typeof options === 'function'){
            callback = options;
            options = undefined;
        }
        const cb = function(err, dsu){
            if (err)
                return _err(`Could not create DSU with ${JSON.stringify(arg)}`, err, callback);
            console.log(`${arg.dsuType} DSU created`);
            callback(undefined, dsu);
        }

        switch (arg.dsuType){
            case DSU_TYPE.SEED:
                return _createDSU(this.varStore, arg, cb)
            case DSU_TYPE.CONST:
                return _createConstDSU(this.varStore, arg, cb);
            case DSU_TYPE.WALLET:
                return _createWalletDSU(this.varStore, arg, cb);
            default:
                callback(`Unsupported key type`);
        }
    }
}

module.exports = CreateDSUCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./genKey":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/genKey.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createFile.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const {_getFS, _err} = require('./utils');

/**
 * Creates a file with the provided content on the destination DSU
 * (similar to a touch command with added content)
 *
 * @class CreateFileCommand
 */
class CreateFileCommand extends Command{
    constructor(varStore) {
        super(varStore);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback){
        command = typeof command === 'string' ? command.split(' ') : command;
        callback(undefined,  {
            path: command.shift(),
            content: command.join(' ')
        });
    }

    /**
     * Writes a file
     * @param {object} arg the command argument
     * <pre>
     *     {
     *         path: (...),
     *         content: (..)
     *     }
     * </pre>
     * @param {Archive|fs} bar
     * @param {object} options
     * @param {function(err, string)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!bar)
            bar = _getFS();
        options = options || {encrypt: true, ignoreMounts: false};
        bar.writeFile(arg.path, arg.content, options, (err) => err
            ? _err(`Could not create file at ${arg.path}`, err, callback)
            : callback(undefined, bar));
    }
}

module.exports = CreateFileCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/define.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * Defines a variable that can later be used in the script
 *
 * @class DefineCommand
 */
class DefineCommand extends Command {
    constructor(varStore) {
        super(varStore);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback) {
        if (!callback){
            callback = next;
            next = undefined;
        }

        callback(undefined, {
            varName: command.shift(),
            command: command
        });
    }

    /**
     * @param {string[]|object} arg the command argument
     * @param {Archive} bar
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        let self = this;
        const _getByName = require('./Registry');

        if (!_getByName(arg.command[0])){
            this.varStore.define(arg.varName, arg.command);
            console.log(`Define executed: ${arg.command}`);
            return callback(undefined, bar);
        }

        const parseCommand = function(command, callback){
            const cmdName = command.shift();
            const actualCmd = _getByName(cmdName);
            if (!actualCmd)
                return callback(`Could not find command`);
            callback(undefined, cmdName, actualCmd, command);
        }

        return parseCommand(arg.command, (err, cmdName, command, args) => err
            ? _err(`Could not parse Command`, err, callback)
            : new (command)(self.varStore, self.source).execute(args, bar, (err, result) => {
                if (err)
                    return _err(`Could not obtain result`, err, callback);
                this.varStore.define(arg.varName, result);
                console.log(`Define executed: ${result}`);
                callback(undefined, bar);
            }));
    }
}

module.exports = DefineCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./Registry":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Registry.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/delete.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */


/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * Deletes everything in the specified path of the DSU
 *
 * @class DeleteCommand
 */
class DeleteCommand extends Command {
    constructor(varStore) {
        super(varStore,undefined, false);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback){
        callback(undefined, command[0]);
    }

    /**
     * @param {string} arg
     * @param {Archive} bar
     * @param {object} [options]
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        if (typeof options === 'function'){
            callback = options;
            options = undefined
        }
        options = options || {ignoreMounts: false, ignoreError: true};
        console.log("Deleting " + arg);
        bar.delete(arg, options, err => err
            ? _err(`Could not delete path '${arg}'`, err, callback)
            : callback(undefined, bar));
    }
}

module.exports = DeleteCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/derive.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _getKeySSISpace, _err } = require('./utils');

/**
 * Derives the provided keySSI
 *
 * @class DeriveCommand
 */
class DeriveCommand extends Command{
    constructor(varStore) {
        super(varStore);
    }

    _parseCommand(command, next, callback) {
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command
            ? !(command === 'false' || command[0] === 'false')
            : true);
    }

    /**
     * derives the provided keySSI (in the source object)
     * @param {object} arg unused
     * @param {KeySSI} bar
     * @param {object} options unsused
     * @param {function(err, KeySSI)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (!callback) {
            callback = options;
            options = undefined;
        }

        try{
            const keySSI = _getKeySSISpace().parse(bar).derive();
            callback(undefined, arg ? keySSI.getIdentifier() : keySSI);
        } catch (e) {
            _err(`Could not derive Key ${JSON.stringify(bar)}`, e, callback)
        }
    }
}

module.exports = DeriveCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/endWith.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');

/**
 * Allows for more complex logic by allowing you to control the output/input for commands
 * while keeping the commands readable
 *
 * basically sets whatever the result of the with operation into the source portion until it finds the endwith command
 *
 * @class EndWithCommand
 */
class EndWithCommand extends Command{
    constructor(varStore) {
        super(varStore);
    }

    /**
     * Returns the source object
     * @param {string[]|object} arg unused
     * @param {Archive} bar unused
     * @param {object} options unused
     * @param {function(err, Archive|KeySSI)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        if (!callback) {
            callback = options;
            options = undefined;
        }
        if (!callback){
            callback = bar;
            bar = arg;
            arg = undefined;
        }

        // return whatever the object was
        if (!bar)
            return callback(`Nothing to return. should not be possible`);

        console.log(`Ending With command. Returning to ${JSON.stringify(bar)}`);
        callback(undefined, bar);
    }
}

module.exports = EndWithCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/genKey.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err, _getKeySSISpace, KEY_TYPE } = require('./utils');

/**
 * Generates a KeySSI
 *
 * @class GenKeyCommand
 */
class GenKeyCommand extends Command {
    constructor(varStore) {
        super(varStore,undefined, false);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }

        const tryParseJson = function(text){
            try {
                let parsedArgs = JSON.parse(text);
                if (parsedArgs && typeof parsedArgs === 'object')
                    return parsedArgs;
                return text;
            } catch (e) {
                // The argument is just a string. leave it be
                return text;
            }
        }

        try {
            let arg = {
                type: command.shift(),
                domain: command.shift(),
                args: tryParseJson(command.shift())
            }

            if (typeof arg.args === 'object' && arg.args.args){
                arg.hint = arg.args.hint;
                arg.args = tryParseJson(arg.args.args);
            }
            callback(undefined, arg);
        } catch (e){
            _err(`could not parse json ${command}`, e, callback);
        }
    }

    /**
     * Creates an Arrays SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {object} args
     * @param {function(err, ArraySSI)} callback
     * @private
     */
    _createArraySSI = function(args, callback){
        const key = _getKeySSISpace().createArraySSI(args.domain, args.args, 'v0', args.hint ? JSON.stringify(args.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Creates a Wallet SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {object} args
     * @param {function(err, ArraySSI)} callback
     */
    _createWalletSSI = function(args, callback){
        const key = _getKeySSISpace().createTemplateWalletSSI(args.domain, args.args, 'v0', args.hint ? JSON.stringify(args.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Creates an Arrays SSI off a secret list
     *
     * Adds options.hint to hit if available
     * @param {object} args
     * @param {function(err, TemplateSeedSSI)} callback
     */
    _createSSI = function(args, callback){
        const key = _getKeySSISpace().createTemplateSeedSSI(args.domain, args.args, undefined, 'v0', args.hint ? JSON.stringify(args.hint) : undefined);
        callback(undefined, key);
    }

    /**
     * Copies a file, from disk or another DSU
     * @param {object} arg
     * <pre>
     *     {
     *         type: (...),
     *         domain: (..),
     *         args: []| {
     *                  hint: (..)
     *                  args: []
     *         }
     *     }
     * </pre>
     * @param {Archive} bar unused
     * @param {object} options unused
     * @param {function(err, KeySSI)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if(!callback){
            callback = options;
            options = bar;
            bar = undefined;
        }
        if (typeof options === 'function'){
            callback = options;
            options = undefined;
        }
        const cb = function(err, keySSI){
            if (err)
                return _err(`Could not create keySSI with ${JSON.stringify(arg)}`, err, callback);
            console.log(`${arg.type} KeySSI created with SSI ${keySSI.getIdentifier()}`)
            callback(undefined, keySSI);
        }

        switch (arg.type){
            case KEY_TYPE.SEED:
                return this._createSSI(arg, cb)
            case KEY_TYPE.ARRAY:
                return this._createArraySSI(arg, cb);
            case KEY_TYPE.WALLET:
                return this._createWalletSSI(arg, cb);
            default:
                callback(`Unsupported key type`);
        }
    }
}

module.exports = GenKeyCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/getIndentifier.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * Returns the identifier for the current source object
 *
 * @class GetIdentifierCommand
 */
class GetIdentifierCommand extends Command{
    constructor(varStore) {
        super(varStore);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next discarded
     * @param {function(err, boolean)} callback
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command
            ? !(command === 'false' || command[0] === 'false')
            : true);
    }

    /**
     * derives the provided keySSI
     * @param {boolean} arg identifier as string (defaults to false)
     * @param {Archive|KeySSI} bar
     * @param {object} options unused
     * @param {function(err, string|KeySSI)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (!callback) {
            callback = options;
            options = undefined;
        }
        if (!bar.getIdentifier && !bar.getKeySSIAsString)
            return callback(`The object cannot be derived. It is a KeySSI or a DSU?`);

        // if its a dsu
        if (bar.constructor && bar.constructor.name === 'Archive')
            return (arg ? bar.getKeySSIAsString : bar.getKeySSIAsObject)((err, identifier) => err
                ? _err(`Could not get identifier`, err, callback)
                : callback(undefined, identifier));

        // if its a KeySSI
        try{
            let identifier = arg ? bar.getIdentifier() : bar;
            if (!identifier)
                return callback(`Could not get identifier`);
            callback(undefined, identifier);
        } catch (e){
            _err(`Could not get identifier`, e, callback);
        }
    }
}

module.exports = GetIdentifierCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/index.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

module.exports = {
    AddFileCommand: require('./addFile'),
    AddFolderCommand: require('./addFolder'),
    CreateDSUCommand: require('./createDSU'),
    CreateFileCommand: require('./createFile'),
    DefineCommand: require('./define'),
    DeleteCommand: require('./delete'),
    DeriveCommand: require('./derive'),
    EndWithCommand: require('./endWith'),
    GenKeyCommand: require('./genKey'),
    GetIdentifierCommand: require('./getIndentifier'),
    MountCommand: require('./mount'),
    ObjToArrayCommand: require('./objToArray'),
    ReadFileCommand: require('./readFile'),
    WithCommand: require('./with'),
    _getByName: require('./Registry')
}
},{"./Registry":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Registry.js","./addFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFile.js","./addFolder":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/addFolder.js","./createDSU":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createDSU.js","./createFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/createFile.js","./define":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/define.js","./delete":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/delete.js","./derive":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/derive.js","./endWith":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/endWith.js","./genKey":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/genKey.js","./getIndentifier":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/getIndentifier.js","./mount":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/mount.js","./objToArray":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/objToArray.js","./readFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/readFile.js","./with":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/with.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/mount.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const ReadFileCommand = require('./readFile');
const { _err, _getFS, _getKeySSISpace } = require('./utils');

/**
 * Mounts a DSU onto the provided path
 *
 * @class MountCommand
 */
class MountCommand extends Command{
    constructor(varStore, source) {
        super(varStore, source, true);
        if (!source)
            this._getFS = require('./utils');
    }

    /**
     * Lists all the mounts in the provided pattern, either via fs or source dsu
     * @param {object} arg
     * @param {function(err, string[])} callback
     * @private
     */
    _listMounts(arg, callback){
        let self = this;
        let basePath = arg.seed_path.split("*");
        const listMethod = this.source ? this.source.listMountedDSUs : _getFS().readdir;
        listMethod(basePath[0], (err, args) => err
            ? _err(`Could not list mounts`, err, callback)
            : callback(undefined, self._transform_mount_arguments(arg, args)));
    }

    /**
     * handles the difference between the mount arguments in the 2 cases (with/without sourceDSU)
     * @param arg
     * @param args
     * @return {*}
     * @private
     */
    _transform_mount_arguments(arg, args){
        return this.source
            ? args.map(m => {
                return {
                    "seed_path": m.identifier,
                    "mount_point": m.path
                }
            })
            : args.map(n => {
                return {
                    "seed_path": arg.seed_path.replace("*", n),
                    "mount_point": arg.mount_point.replace("*", n)
                };
            });
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|string[]|object)} callback
     * @protected
     */
    _parseCommand(command, next, callback){
        let arg = {
            "seed_path": command[0],
            "mount_point": command[1]
        };

        if (!arg.seed_path.match(/[\\/]\*[\\/]/))
            return callback(undefined, arg);   // single mount
        // multiple mount
        this._listMounts(arg, callback);
    }

    /**
     * Mounts a DSu onto a path
     * @param {object} arg
     * <pre>
     *     {
     *         seed_path: (...),
     *         mount_point: (..)
     *     }
     * </pre>
     * @param {Archive} [bar]
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        let self = this;
        if (typeof options === 'function'){
            callback = options;
            options = undefined;
        }

        const doMount = function(seed, callback){
            console.log("Mounting seed " + seed + " to " + arg.mount_point);
            bar.mount(arg.mount_point, seed, err => err
                ? _err(`Could not perform mount of ${seed} at ${arg.seed_path}`, err, callback)
                : callback(undefined, bar));
        };
        try {
            if (_getKeySSISpace().parse(arg.seed_path))
                return doMount(arg.seed_path, callback);
        } catch (e){
            new ReadFileCommand(this.varStore, this.source).execute(arg.seed_path, (err, seed) => {
                if (err)
                    return _err(`Could not read seed from ${arg.seed_path}`, err, callback);
                seed = seed.toString();
                doMount(seed, callback);
            });
        }
    }
}

module.exports = MountCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./readFile":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/readFile.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/objToArray.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');

/**
 * Util Command to convert objects to and array with their values
 * @class ObjToArrayCommand
 */
class ObjToArrayCommand extends Command{
    constructor(varStore, source) {
        super(varStore, source, false);
    }

    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, typeof command === 'string' ? command : command.shift());
    }

    /**
     * Outputs all args to console
     * @param {object} arg
     * @param {Archive} bar
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (!callback) {
            callback = options;
            options = undefined;
        }
        try{
            const obj = JSON.parse(arg);
            if (typeof obj !== 'object')
                return callback(`Provided argument is not an object`);
            if (Array.isArray(obj)){
                console.log(`Object was already an array ${arg}`);
                callback(undefined, obj);
            }
            callback(undefined, JSON.stringify(Object.values(obj)));
        } catch (e) {
            _err(`Could not parse object. Was it a valid json?`, e, callback);
        }
    }
}

module.exports = ObjToArrayCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/readFile.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _getFS, _err } = require('./utils')

/**
 * Reads The contents of a file from disk or from a sourceDSU
 *
 * supports sourceDSU
 *
 * @class ReadFileCommand
 */
class ReadFileCommand extends Command{
    constructor(varStore, source) {
        super(varStore, source ? source : _getFS());
        this.dataToString = !source;
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string)} callback
     * @protected
     */
    _parseCommand(command, next, callback){
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command);
    }

    /**
     * @param {Archive} bar unused in this method
     * @param {string} arg the command argument
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback){
        if (typeof options === 'function'){
            callback = options;
            options = undefined;
        }
        if (!callback) {
            callback = bar;
            bar = undefined
        }

        this.source.readFile(arg, (err, data) => err
            ? _err(`Could not read file at ${arg}`, err, callback)
            : callback(undefined, this.dataToString ? data : data.toString()));
    }
}

module.exports = ReadFileCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js":[function(require,module,exports){
/**
 * @module Commands
 */

/**
 * cache of node's fs object
 */

let  _fileSystem = undefined;

/**
 * Caches and returns node's fs object if the environment is right
 * @return {fs}
 */
const _getFS = function(){
    if ($$.environmentType !== 'nodejs')
        throw new Error("Wrong environment for this function. Please make sure you know what you are doing...");
    if (!_fileSystem)
        _fileSystem = require('fs');
    return _fileSystem;
}

/**
 * Provides Util functions and Methods as well as caching for the open DSU resolver and {@Link DSUBuilder}
 */

let resolver, keyssi;

/**
 * Wrapper around
 * <pre>
 *     OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(msg, err));
 * </pre>
 * @param msg
 * @param err
 * @param callback
 * @protected
 */
const _err = function(msg, err, callback){
    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(msg, err));
}

/**
 * for singleton use
 * @returns {function} resolver api
 */
const _getResolver = function(){
    if (!resolver)
        resolver = require('opendsu').loadApi('resolver');
    return resolver;
}

/**
 * for singleton use
 * @returns {function} keyssi api
 */
const _getKeySSISpace = function(){
    if (!keyssi)
        keyssi = require('opendsu').loadApi('keyssi');
    return keyssi;
}

const KEY_TYPE = {
    ARRAY: "array",
    SEED: "seed",
    WALLET: 'wallet'
}

const DSU_TYPE = {
    CONST: "const",
    WALLET: "wallet",
    SEED: "seed"
}

module.exports = {
    _getFS,
    _getResolver,
    _getKeySSISpace,
    _err,
    KEY_TYPE,
    DSU_TYPE
};
},{"fs":false,"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/with.js":[function(require,module,exports){
/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _err } = require('./utils');
const endCommand = 'endwith';
const startCommand = 'with';



/**
 * Allows for more complex logic by allowing you to control the output/input for commands
 * while keeping the commands readable
 *
 * basically sets whatever the result of the with operation into the source portion until it finds the endwith command
 *
 * @class WithCommand
 */
class WithCommand extends Command {
    constructor(varStore, source) {
        super(varStore, source);
    }

    /**
     * @param {string[]|string} command the command split into words
     * @param {string[]} next the following Commands
     * @param {function(err, string|object)} [callback] for async versatility
     * @return {string|object} the command argument
     * @protected
     */
    _parseCommand(command, next, callback) {
        if (!next)
            throw new Error("No next defined");
        const commandsToConsider = [command];
        let cmd;
        let count = 0;
        while (!this._isEndCommand((cmd = next.shift())) && count === 0){
            let c = cmd.split(/\s+/);
            commandsToConsider.push(c);
            if (this._isStartCommand(c[0]))
                count++;
            if (this._isEndCommand(c[0]))
                count--;
        }

        commandsToConsider.push(cmd.split(/\s+/));
        callback(undefined, commandsToConsider);
    }

    _isStartCommand(cmd){
        return cmd.indexOf(startCommand) === 0;
    }

    _isEndCommand(cmd) {
        return cmd.indexOf(endCommand) === 0;
    }

    /**
     * @param {string[]} arg the command argument
     * @param {Archive} bar
     * @param {object} options
     * @param {function(err, Archive)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        let self = this;
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        if (!callback){
            callback = bar;
            bar = undefined;
        }
        const _getByName = require('./Registry');

        const parseCommand = function(command, callback){
            const cmdName = command.shift();
            const actualCmd = _getByName(cmdName);
            if (!actualCmd)
                return callback(`Could not find command`);
            callback(undefined, cmdName, actualCmd, command);
        }

        const performWith = function(newSource, commands, callback){
            const cmd = commands.shift();
            if (!cmd)
                return callback(`No endWith command found. this should not be possible`);
            parseCommand(cmd, (err, cmdName, command, args) => {
                if (err)
                    return _err(`Could not parse the command ${cmd}`, err, callback);
                if (cmdName === endCommand)
                    return new command(self.varStore, self.source).execute(undefined, bar, callback);
                new command(self.varStore, self.source).execute(args, newSource, (err, result) => {
                    if (err)
                        return _err(`Could not execute command ${cmdName}`, err, callback);
                    console.log(`Command ${cmdName} executed with output ${JSON.stringify(result)}`);
                    performWith(newSource, commands, callback);
                });
            });
        }

        const cmdOrVar = arg[0][0];
        const cmd = _getByName(cmdOrVar);

        if (!cmd){
            console.log(`With VARIABLE executed: ${arg[0]}`);
            return performWith(arg.shift().shift(), arg, callback);
        }

        parseCommand(arg.shift(), (err, cmdName, command, args) => err
            ? _err(`Could not parse Command`, err, callback)
            : new (command)(self.varStore, self.source).execute(args, (err, result) => {
                if (err)
                    return _err(`Could not obtain result`, err, callback);
                console.log(`With COMMAND executed: ${JSON.stringify(result)}`);
                performWith(result, arg, callback);
            }));
    }
}

module.exports = WithCommand;
},{"./Command":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Command.js","./Registry":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/Registry.js","./utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/utils.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/index.js":[function(require,module,exports){
/**
 * @module dt
 */

/**
 * Provides a Environment Independent and Versatile Dossier Building API.
 *
 * Meant to be integrated into OpenDSU
 */

/**
 * Returns a DossierBuilder Instance
 * @param {Archive} [sourceDSU] should only be provided when cloning a DSU
 * @return {DossierBuilder}
 */
const getDossierBuilder = (sourceDSU, ) => {
    return new (require("./DossierBuilder"))(sourceDSU)
}

module.exports = {
    getDossierBuilder,
    Commands: require('./commands'),
    AppBuilderService: require('./AppBuilderService')
}

},{"./AppBuilderService":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/AppBuilderService.js","./DossierBuilder":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/DossierBuilder.js","./commands":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/commands/index.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/error/index.js":[function(require,module,exports){
function ErrorWrapper(message, err, otherErrors){
    let newErr = {};
    if((err && err.message) || otherErrors) {
        if (err.originalMessage) {
            newErr.originalMessage = err.originalMessage;
        }else{
            newErr.originalMessage = err.message;
            if(otherErrors){
                if (typeof otherErrors === "string") {
                    newErr.originalMessage += otherErrors;
                }

                if (Array.isArray(otherErrors)) {
                    otherErrors.forEach(e => newErr.originalMessage += `[${e.message}]`);
                }
            }
            if(typeof newErr.originalMessage === "string") {
                newErr.originalMessage = newErr.originalMessage.replace(/\n/g, " ");
            }
        }
    }

    try{
        if (err.originalMessage) {
            newErr = new Error(message + `(${err.originalMessage})`);
            newErr.originalMessage = err.originalMessage;
        }else{
            newErr = new Error(newErr.originalMessage);
            newErr.originalMessage = newErr.message;
        }
        throw newErr;
    }catch (e) {
        newErr = e;
    }
    newErr.previousError = err;
    newErr.debug_message = message;
    if(err){
        newErr.debug_stack   = err.stack;
    }
    if(otherErrors){
        newErr.otherErrors = otherErrors;
    }
    return newErr;
}

function createOpenDSUErrorWrapper(message, err, otherErrors){
    if(typeof message !== "string"){
        if(typeof err != "undefined"){
            err = message;
            message = "Wrong usage of createErrorWrapper";
        } else {
            message = "Wrong usage of createErrorWrapper";
        }
    }
    return ErrorWrapper(message, err, otherErrors);
}

function registerMandatoryCallback(callback, timeout){
    if(timeout == undefined){
        timeout = 5000; //5 seconds
    }
    let callbackCalled = false;
    let callStackErr = false;
    try{
        throw new Error("Callback should be called");
    } catch(err){
        callStackErr = err;
    }
    setTimeout(function(){
        if(!callbackCalled){
            reportUserRelevantError("Expected callback not called after " + timeout + " seconds. The calling stack is here: ", callStackErr);
        }
    }, timeout);

    return function(...args){
        callbackCalled = true;
        callback(...args);
    };
}

function OpenDSUSafeCallback(callback){
    if(callback && typeof callback === 'function') {
        return callback;
    }
    else return function(err, res){
        if(err){
            reportUserRelevantError("Unexpected error happened without proper handling:", err);
        } else {
            reportUserRelevantWarning("Ignored result. Please add a proper callback when using this function! " + res)
        }
    }
}

let observable = require("./../utils/observable").createObservable();
let devObservers = [];
function reportUserRelevantError(message, err, showIntermediateErrors){
    observable.dispatchEvent("error", {message, err});
    console.log(message);
    if(err && typeof err.debug_message != "undefined"){
        printErrorWrapper(err, showIntermediateErrors);
    }
}

function reportUserRelevantWarning(message){
    observable.dispatchEvent("warn", message);
    console.log(">>>",message);
}


function reportUserRelevantInfo(message){
    observable.dispatchEvent("info", message);
    console.log(">>>",message);
}

function reportDevRelevantInfo(message){
    devObservers.forEach( c=> {
        c(message);
    })
    console.log(">>>",message);
}

function unobserveUserRelevantMessages(type, callback){
    switch(type){
        case "error": observable.off(type, callback);break;
        case "info": observable.off(type, callback);break;
        case "warn": observable.off(type, callback);break;
        default:
            let index = devObservers.indexOf(callback);
            if(index !==-1){
                devObservers.splice(index, 1);
            }
    }
}

function observeUserRelevantMessages(type, callback){
    switch(type){
        case "error": observable.on(type, callback);break;
        case "info": observable.on(type, callback);break;
        case "warn": observable.on(type, callback);break;
        case "dev": devObservers.push(callback);break;
        default: devObservers.push(callback);break;
    }
}

function printErrorWrapper(ew, showIntermediateErrors){
    let level = 0;
    console.log("Top level error:",  ew.debug_message, ew.debug_stack);
    let firstError;
    ew = ew.previousError;
     while(ew){
         if(showIntermediateErrors && ew.previousError){
             console.log("Error at layer ",level," :", ew.debug_message, ew.debug_stack);
         }
         level++;
         firstError = ew;
         ew = ew.previousError;
     }
    console.log("\tFirst error in the ErrorWrapper at level ",level," :", firstError);
}

function printOpenDSUError(...args){
    for( let elem of args){
        if( typeof elem.previousError !=  "undefined"){
            printErrorWrapper(elem);
        } else {
            console.log(elem);
        }
    }
}

module.exports = {
    createOpenDSUErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    reportUserRelevantInfo,
    reportDevRelevantInfo,
    observeUserRelevantMessages,
    unobserveUserRelevantMessages,
    OpenDSUSafeCallback,
    registerMandatoryCallback,
    printOpenDSUError
}

},{"./../utils/observable":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/observable.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/browser/index.js":[function(require,module,exports){
function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, options, callback) {
		if(typeof options === "function"){
			callback = options;
			options = {};
		}

		const xhr = new XMLHttpRequest();

		xhr.onload = function () {
			if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
				const data = xhr.response;
				callback(undefined, data);
			} else {
				if(xhr.status>=400){
					const error = new Error("An error occured. StatusCode: " + xhr.status);
					callback({error: error, statusCode: xhr.status});
				} else {
					console.log(`Status code ${xhr.status} received, response is ignored.`);
				}
			}
		};

		xhr.onerror = function (e) {
			callback(new Error("A network error occurred"));
		};

		xhr.open(httpMethod, url, true);
		//xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		if(typeof options.headers !== "undefined"){
			for(let name in options.headers){
				xhr.setRequestHeader(name, options.headers[name]);
			}
		}

		if(data && data.pipe && typeof data.pipe === "function"){
			const buffers = [];
			data.on("data", function(data) {
				buffers.push(data);
			});
			data.on("end", function() {
				const actualContents = $$.Buffer.concat(buffers);
				xhr.send(actualContents);
			});
		}
		else {
			if(ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
				xhr.setRequestHeader('Content-Type', 'application/octet-stream');

				/**
				 * Content-Length is an unsafe header and we cannot set it.
				 * When browser is making a request that is intercepted by a service worker,
				 * the Content-Length header is not set implicitly.
				 */
				xhr.setRequestHeader('X-Content-Length', data.byteLength);
			}
			xhr.send(data);
		}
	};
}

function doGet(url, options, callback){
	if (typeof options === "function") {
		callback = options;
		options = undefined;
	}

	fetch(url, options)
		.then(response => response.text())
		.then(data => callback(undefined, data))
		.catch(err => callback(err));

}

module.exports = {
	fetch: fetch,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT'),
	doGet
}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js":[function(require,module,exports){
/**
 * http API space
 */
const or = require('overwrite-require');

switch ($$.environmentType) {
	case or.constants.BROWSER_ENVIRONMENT_TYPE:
		module.exports = require("./browser");
		break;
	case or.constants.WEB_WORKER_ENVIRONMENT_TYPE:
	case or.constants.SERVICE_WORKER_ENVIRONMENT_TYPE:
		module.exports = require("./serviceWorker");
		break;
	default:
		module.exports = require("./node");
}

//enable support for http interceptors.
require("./utils/interceptors").enable(module.exports);

const PollRequestManager = require("./utils/PollRequestManager");
const rm = new PollRequestManager(module.exports.fetch);

module.exports.poll = function (url, options, delayStart) {
	const request = rm.createRequest(url, options, delayStart);
	return request;
};

module.exports.unpoll = function(request){
	rm.cancelRequest(request);
}

},{"./browser":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/browser/index.js","./node":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/node/index.js","./serviceWorker":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/serviceWorker/index.js","./utils/PollRequestManager":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/utils/PollRequestManager.js","./utils/interceptors":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/utils/interceptors.js","overwrite-require":"overwrite-require"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/node/fetch.js":[function(require,module,exports){
const http = require("http");
const https = require("https");
const URL = require("url");

function getProtocol(url, options) {
	let protocol;

	// const urlObject = new URL(url).catch((err) => { throw new Error(err) });
	// return urlObject.protocol === 'http:' ? http : https

	if (typeof options !== "undefined") {
		if (options.protocol === 'http') {
			protocol = http;
		} else if (options.protocol === 'https') {
			protocol = https;
		} else {
			if (url.startsWith("https:")) {
				protocol = https;
			} else if (url.startsWith("http:")) {
				protocol = http;
			}
		}
	} else {
		if (url.startsWith("https:")) {
			protocol = https;
		} else if (url.startsWith("http:")) {
			protocol = http;
		}
	}

	if (typeof protocol === "undefined") {
		throw new Error(`Unable to determine the protocol`);
	}

	return protocol;
}

function decipherUrl(url, options) {
	const innerUrl = URL.parse(url);

	options.hostname = innerUrl.hostname;
	options.path = innerUrl.pathname + (innerUrl.search || '');
	options.port = parseInt(innerUrl.port);
}

function getMethod(options) {
	let method = 'get';
	if (typeof options !== "undefined") {
		method = options.method;
	}
	return method;
}

function convertOptions(options = {}) {
	//convert from fetch options into xhr options

	if (typeof options.method === "undefined") {
		options.method = 'GET';
	}

	return options;
}

function fetch(url, options = {}) {
	const protocol = getProtocol(url, options);

	let promise = new Promise((resolve, reject) => {
		decipherUrl(url, options);

		let request = protocol.request(url, options, (response) => {
			resolve(new Response(request, response));
		});

		if (options.body) {
			let body = options.body;
			if (typeof body.pipe === 'function') {
				body.pipe(request);
			} else {
				if (typeof body !== 'string' && !$$.Buffer.isBuffer(body) && !ArrayBuffer.isView(body)) {
					body = JSON.stringify(body);
				}

				request.write(body);
			}
		}

		request.on("error", (error) => {
			reject(error);
		});

		request.end();
	});

	return promise;
}

function Response(httpRequest, httpResponse) {
	let handlers = {};

	let readingInProgress = false;
	function readResponse(callback) {
		if (readingInProgress) {
			throw new Error("Response reading in progress");
		}

		readingInProgress = true;

		//data collecting
		let rawData;
		const contentType = httpResponse.headers['content-type'];

		if (contentType === "application/octet-stream") {
			rawData = [];
		} else {
			rawData = '';
		}

		httpResponse.on('data', (chunk) => {
			if (Array.isArray(rawData)) {
				rawData.push(...chunk);
			} else {
				rawData += chunk;
			}
		});

		httpResponse.on('end', () => {
			try {
				if (Array.isArray(rawData)) {
					rawData = $$.Buffer.from(rawData);
				}
				callback(undefined, rawData);
			} catch (err) {
				OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to process raw data`, err));
			} finally {
				//trying to prevent getting ECONNRESET error after getting our response
				httpRequest.abort();
			}
		});
	}

	this.ok = httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 ? true : false;
	this.statusCode = httpResponse.statusCode;
	this.statusMessage = httpResponse.statusMessage;

	this.arrayBuffer = function () {
		let promise = new Promise((resolve, reject) => {
			readResponse((err, responseBody) => {
				if (err) {
					return reject(err);
				}
				//endure responseBody has the wright type of ArrayBuffer
				resolve(responseBody);
			});
		});
		return promise;
	}

	this.blob = function () {
		let promise = new Promise((resolve, reject) => {
			readResponse((err, responseBody) => {
				if (err) {
					return reject(err);
				}
				resolve(responseBody);
			});
		});
		return promise;
	}

	this.text = function () {
		let promise = new Promise((resolve, reject) => {
			readResponse((err, responseBody) => {
				if (err) {
					return reject(err);
				}
				resolve(responseBody);
			});
		});
		return promise;
	}

	this.formData = function () {
		let promise = new Promise((resolve, reject) => {
			readResponse((err, responseBody) => {
				if (err) {
					return reject(err);
				}
				resolve(responseBody);
			});
		});
		return promise;
	}

	this.json = function () {
		let promise = new Promise((resolve, reject) => {
			readResponse((err, responseBody) => {
				if (err) {
					return reject(err);
				}
				let jsonContent;
				try {
					//do we really need this if ?!
					if ($$.Buffer.isBuffer(responseBody)) {
						responseBody = responseBody.toString();
					}
					jsonContent = JSON.parse(responseBody);
				} catch (e) {
					return reject(e);
				}
				resolve(jsonContent);
			});
		});
		return promise;
	}

	return this;
}

module.exports = {
	fetch
}

},{"http":false,"https":false,"url":false}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/node/index.js":[function(require,module,exports){
const http = require("http");
const https = require("https");
const URL = require("url");

const userAgent = 'PSK NodeAgent/0.0.1';
const signatureHeaderName = process.env.vmq_signature_header_name || "x-signature";

function getNetworkForOptions(options) {
	if(options.protocol === 'http:') {
		return http;
	} else if(options.protocol === 'https:') {
		return https;
	} else {
		throw new Error(`Can't handle protocol ${options.protocol}`);
	}

}

function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, reqOptions, callback) {
		if(typeof reqOptions === "function"){
			callback = reqOptions;
			reqOptions = {};
		}
		const innerUrl = URL.parse(url);

		const options = {
			hostname: innerUrl.hostname,
			path: innerUrl.pathname,
			port: parseInt(innerUrl.port),
			headers: {
				'User-Agent': userAgent,
				[signatureHeaderName]: 'replaceThisPlaceholderSignature'
			},
			method: httpMethod
		};

		for(let name in reqOptions.headers){
			options.headers[name] = reqOptions.headers[name];
		}

		const network = getNetworkForOptions(innerUrl);

		if (ArrayBuffer.isView(data) || $$.Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
			if (!$$.Buffer.isBuffer(data)) {
				data = $$.Buffer.from(data);
			}

			options.headers['Content-Type'] = 'application/octet-stream';
			options.headers['Content-Length'] = data.length;
		}

		const req = network.request(options, (res) => {
			const {statusCode} = res;

			let error;
			if (statusCode >= 400) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}\n` +
					`URL: ${options.hostname}:${options.port}${options.path}`);
			}

			let rawData = '';
			res.on('data', (chunk) => {
				rawData += chunk;
			});
			res.on('end', () => {
				try {
					if (error) {
						let response = rawData;
						try {
							response = JSON.parse(rawData);
						} catch (error) {
							console.log('parse error', error);
							// the received response is not a JSON, so we keep it as it is
						}

						const message = response.message ? response.message : response;
						callback({error: error, statusCode: statusCode, message: message});
						return;
					}

					callback(undefined, rawData, res.headers);
				} catch (err) {
					console.error(err);
				}finally {
					//trying to prevent getting ECONNRESET error after getting our response
					req.abort();
				}
			});
		}).on("error", (error) => {
			console.log(`[POST] ${url}`, error);
			callback(error);
		});

		if (data && data.pipe && typeof data.pipe === "function") {
			data.pipe(req);
			return;
		}

		if (typeof data !== 'string' && !$$.Buffer.isBuffer(data) && !ArrayBuffer.isView(data)) {
			data = JSON.stringify(data);
		}

		req.write(data);
		req.end();
	};
}

module.exports = {
	fetch: require("./fetch").fetch,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT')
}
},{"./fetch":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/node/fetch.js","http":false,"https":false,"url":false}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/serviceWorker/index.js":[function(require,module,exports){
function generateMethodForRequestWithData(httpMethod) {
	return function (url, data, options, callback) {
		if(typeof options === "function"){
			callback = options;
			options = {};
		}
		const headers = options.headers || {};
		if(ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
			headers['Content-Type'] = 'application/octet-stream';

			/**
			 * Content-Length is an unsafe header and we cannot set it.
			 * When browser is making a request that is intercepted by a service worker,
			 * the Content-Length header is not set implicitly.
			 */
			headers['X-Content-Length'] = data.byteLength;
		}

		fetch(url, {
			method: httpMethod,
			mode: 'cors',
			headers,
			body: data
		}).then(function (response) {
			if (response.status >= 400) {
				throw new Error(`An error occurred ${response.statusText}`);
			}
			return response.text().catch((err) => {
				// This happens when the response is empty
				let emptyResponse = {message: ""}
				return JSON.stringify(emptyResponse);
			});
		}).then(function (data) {
			callback(null, data)
		}).catch(error => {
			callback(error);
		});
	};
}

module.exports = {
	fetch: fetch,
	doPost: generateMethodForRequestWithData('POST'),
	doPut: generateMethodForRequestWithData('PUT')
}

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/utils/PollRequestManager.js":[function(require,module,exports){
function PollRequestManager(fetchFunction, pollingTimeout = 1000){

	const requests = new Map();

	function Request(url, options, delay = 0) {
		let promiseHandlers = {};
		let currentState = undefined;
		let timeout;
		this.url = url;

		this.execute = function() {
			if (!currentState && delay) {
				currentState = new Promise((resolve, reject) => {
					timeout = setTimeout(() => {
						fetchFunction(url, options).then((response) => {
							resolve(response);
						}).catch((err) => {
							reject(err);
						})
					}, delay);
				});
			} else {
				currentState = fetchFunction(url, options);
			}
			return currentState;
		}

		this.cancelExecution = function() {
			clearTimeout(timeout);
			timeout = undefined;
			if(typeof currentState !== "undefined"){
				currentState = undefined;
			}
			promiseHandlers.resolve = () => {};
			promiseHandlers.reject = () => {};
		}

		this.setExecutor = function(resolve, reject) {
			promiseHandlers.resolve = resolve;
			promiseHandlers.reject = reject;
		}

		this.resolve = function(...args) {
			promiseHandlers.resolve(...args);
			this.destroy();
		}

		this.reject = function(...args) {
			promiseHandlers.reject(...args);
			this.destroy();
		}

		this.destroy = function(removeFromPool = true) {
			this.cancelExecution();

			if (!removeFromPool) {
				return;
			}

			// Find our identifier
			const requestsEntries = requests.entries()
			let identifier;
			for (const [key, value] of requestsEntries) {
				if (value === this) {
					identifier = key;
					break;
				}
			}

			if (identifier) {
				requests.delete(identifier);
			}
		}
	}

	this.createRequest = function (url, options, delayedStart = 0) {
		const request = new Request(url, options, delayedStart);

		const promise = new Promise((resolve, reject) => {
			request.setExecutor(resolve, reject);
			createPollThread(request);
		});
		promise.abort = () => {
			this.cancelRequest(promise);
		};

		requests.set(promise, request);
		return promise;
	};

	this.cancelRequest = function(promiseOfRequest){
		if(typeof promiseOfRequest === "undefined"){
			console.log("No active request found.");
			return;
		}

		const request = requests.get(promiseOfRequest);
		if (request) {
			request.destroy(false);
			requests.delete(promiseOfRequest);
		}
	}


	/* *************************** polling zone ****************************/
	function createPollThread(request) {
		function reArm() {
			request.execute().then( (response) => {
				if (!response.ok) {
					//todo check for http errors like 404
					return setTimeout(reArm, pollingTimeout);
				}
				request.resolve(response);
			}).catch( (err) => {
				switch(err.code){
					case "ETIMEDOUT":
						setTimeout(reArm, pollingTimeout);
						break;
					case "ECONNREFUSED":
						setTimeout(reArm, pollingTimeout*1.5);
						break;
					default:
						request.reject(err);
				}
			});
		}

		reArm();
	}

}

module.exports = PollRequestManager;

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/http/utils/interceptors.js":[function(require,module,exports){
let interceptors = [];

function registerInterceptor(interceptor){
    if(typeof interceptor !== "function"){
        throw new Error('interceptor argument should be a function');
    }
    interceptors.push(interceptor);
}

function unregisterInterceptor(interceptor){
    let index = interceptors.indexOf(interceptor);
    if(index !== -1){
        interceptors.splice(index, 1);
    }
}

function callInterceptors(target, callback){
    let index = -1;
    function executeInterceptor(result){
        index++;
        if(index >= interceptors.length){
            return callback(undefined, result);
        }
        let interceptor = interceptors[index];
        interceptor(target, (err, result)=>{
            if(err){
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to execute interceptor`, err));
            }
            return executeInterceptor(result);
        });
    }
    executeInterceptor(target);
}

function setupInterceptors(handler){
    const interceptMethods = [{name: "doPost", position: 2}, {name:"doPut", position: 2}];
    interceptMethods.forEach(function(target){
        let method = handler[target.name];
        handler[target.name] = function(...args){
            let headers = {};
            let optionsAvailable = false;
            if(args.length > target.position+1 && ["function", "undefined"].indexOf(typeof args[target.position]) === -1){
                headers = args[target.position]["headers"];
                optionsAvailable = true;
            }

            let data = {url: args[0], headers};
            callInterceptors(data, function(err, result){
                if(optionsAvailable){
                    args[target.position]["headers"] = result.headers;
                }else{
                    args.splice(target.position, 0, {headers: result.headers});
                }

                return method(...args);
            });
        }
    });

    const promisedBasedInterceptors = [{name: "fetch", position: 1}];
    promisedBasedInterceptors.forEach(function(target){
        let method = handler[target.name];
        handler[target.name] = function(...args){
            return new Promise((resolve, reject) => {
                if (args.length === 1) {
                    args.push({headers: {}});
                }

                if(typeof args[1].headers === "undefined"){
                    args[1].headers = {};
                }
                let headers = args[1].headers;

                let data = {url: args[0], headers};
                callInterceptors(data, function(err, result) {

                    let options = args[target.position];
                    options.headers = result.headers;

                    method(...args)
                        .then((...args) => {
                            resolve(...args);
                        })
                        .catch((...args) => {
                            reject(...args);
                        });
                });
            });
        };
    });
}

function enable(handler){
    //exposing working methods
    handler.registerInterceptor = registerInterceptor;
    handler.unregisterInterceptor = unregisterInterceptor;
    //setting up the interception mechanism
    setupInterceptors(handler);
}

module.exports = {enable};
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/keyssi/index.js":[function(require,module,exports){
const keySSIResolver = require("key-ssi-resolver");
const crypto = require("../crypto");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString, options) => {
    return keySSIFactory.create(ssiString, options);
};

const createSeedSSI = (domain, vn, hint, callback) => {
    if (typeof vn == "function") {
        callback = vn;
        vn = undefined;
    }

    if (typeof hint == "function") {
        callback = hint;
        hint = undefined;
    }

    let seedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);

    seedSSI.initialize(domain, undefined, undefined, vn, hint, callback);
    return seedSSI;
};

const buildSeedSSI = function () {
    throw new Error("Obsoleted, use buildTemplateSeedSSI");
}

const buildTemplateSeedSSI = (domain, specificString, control, vn, hint, callback) => {
    console.log("This function is obsolete. Use createTemplateSeedSSI instead.");
    return createTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint, callback);
};

const createTemplateSeedSSI = (domain, specificString, control, vn, hint, callback) => {
    return createTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint, callback);
};

const createHashLinkSSI = (domain, hash, vn, hint) => {
    const hashLinkSSI = keySSIFactory.createType(SSITypes.HASH_LINK_SSI)
    hashLinkSSI.initialize(domain, hash, vn, hint);
    return hashLinkSSI;
};

const createTemplateKeySSI = (ssiType, domain, specificString, control, vn, hint, callback) => {
    //only ssiType and domain are mandatory arguments
    if (typeof specificString === "function") {
        callback = specificString;
        specificString = undefined;
    }
    if (typeof control === "function") {
        callback = control;
        control = undefined;
    }
    if (typeof vn === "function") {
        callback = vn;
        specificString = undefined;
    }
    if (typeof hint === "function") {
        callback = hint;
        hint = undefined;
    }
    const keySSI = keySSIFactory.createType(ssiType);
    keySSI.load(ssiType, domain, specificString, control, vn, hint);
    if (typeof callback === "function") {
        callback(undefined, keySSI);
    }
    return keySSI;
};


const buildTemplateWalletSSI = (domain, arrayWIthCredentials, hint) => {
    console.log("This function is obsolete. Use createTemplateWalletSSI instead.");
    try {
        let ssi = createArraySSI(domain, arrayWIthCredentials, undefined, hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch (err) {
        console.log("Failing to build WalletSSI");
    }
};

const createTemplateWalletSSI = (domain, arrayWIthCredentials, hint) => {
    try {
        let ssi = createArraySSI(domain, arrayWIthCredentials, undefined, hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch (err) {
        console.log("Failing to build WalletSSI");
    }
};

const createConstSSI = (domain, constString, vn, hint, callback) => {
    const constSSI = keySSIFactory.createType(SSITypes.CONST_SSI);
    constSSI.initialize(domain, constString, vn, hint);
    return constSSI;
};

const createArraySSI = (domain, arr, vn, hint, callback) => {
    const arraySSI = keySSIFactory.createType(SSITypes.ARRAY_SSI);
    arraySSI.initialize(domain, arr, vn, hint);
    return arraySSI;
};

const buildSymmetricalEncryptionSSI = (domain, encryptionKey, control, vn, hint, callback) => {
    console.log("This function is obsolete. Use createTemplateSymmetricalEncryptionSSI instead.");
    return createTemplateKeySSI(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, domain, encryptionKey, control, vn, hint, callback);
};

const createTemplateSymmetricalEncryptionSSI = (domain, encryptionKey, control, vn, hint, callback) => {
    return createTemplateKeySSI(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, domain, encryptionKey, control, vn, hint, callback);
};

const createToken = (domain, amountOrSerialNumber, vn, hint, callback) => {
    if (typeof vn === "function") {
        callback = vn;
        vn = undefined;
        hint = undefined
    }

    if (typeof hint === "function") {
        callback = hint;
        hint = undefined
    }
    // the tokenSSI is closely linked with an ownershipSSI
    // the tokenSSI must have the ownershipSSI's public key hash
    // the ownershipSSI must have the tokenSSI's base58 ssi
    const ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, undefined, vn, hint, (err) => {

        const ownershipPublicKeyHash = ownershipSSI.getPublicKeyHash();
        const ownershipPrivateKey = ownershipSSI.getPrivateKey();

        const tokenSSI = keySSIFactory.createType(SSITypes.TOKEN_SSI);
        tokenSSI.initialize(domain, amountOrSerialNumber, ownershipPublicKeyHash, vn, hint);

        // update ownershipSSI to set level and token
        const ownershipLevelAndToken = `0/${tokenSSI.getIdentifier()}`;
        ownershipSSI.load(SSITypes.OWNERSHIP_SSI, domain, ownershipPrivateKey, ownershipLevelAndToken, vn, hint);

        // create a TRANSFER_SSI, since the token's ownership is first transfered to the owner itself
        const transferTimestamp = new Date().getTime();

        // get signature by sign(lastEntryInAnchor, transferTimestamp, ownershipPublicKeyHash)
        const transferDataToSign = `${transferTimestamp}${ownershipPublicKeyHash}`;
        ownershipSSI.sign(transferDataToSign, (err, signature) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to signed transfer data", err));
            }

            let transferSSI = createTransferSSI(domain, ownershipPublicKeyHash, transferTimestamp, signature);
            const {createAnchor, appendToAnchor} = require("../anchoring");
            createAnchor(ownershipSSI, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to anchor ownershipSSI", err));
                }

                appendToAnchor(ownershipSSI, transferSSI, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to anchor transferSSI", err));
                    }

                    const result = {
                        tokenSSI: tokenSSI,
                        ownershipSSI: ownershipSSI,
                        transferSSI: transferSSI
                    }

                    callback(undefined, result);
                });
            });
        });
    });
};

const createOwnershipSSI = (domain, levelAndToken, vn, hint, callback) => {
    let ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, levelAndToken, vn, hint, callback);
    return ownershipSSI;
};

const createTransferSSI = (domain, hashNewPublicKey, timestamp, signatureCurrentOwner, vn, hint, callback) => {
    let transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    transferSSI.initialize(domain, hashNewPublicKey, timestamp, signatureCurrentOwner, vn, hint, callback);
    return transferSSI;
};

const createTemplateTransferSSI = (domain, hashNewPublicKey, vn, hint) => {
    let transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    transferSSI.load(domain, hashNewPublicKey, undefined, vn, hint);
    return transferSSI;
};

const createSignedHashLinkSSI = (domain, hashLink, timestamp, signature, vn, hint) => {
    let signedHashLink = keySSIFactory.createType(SSITypes.SIGNED_HASH_LINK_SSI);
    signedHashLink.initialize(domain, hashLink, timestamp, signature, vn, hint);
    return signedHashLink;
};

const createPublicKeySSI = (compatibleFamilyName, publicKey, vn) => {
    let publicKeySSI = keySSIFactory.createType(SSITypes.PUBLIC_KEY_SSI);
    publicKeySSI.initialize(compatibleFamilyName, publicKey, vn);
    return publicKeySSI;
};

module.exports = {
    parse,
    createSeedSSI,
    buildSeedSSI,
    buildTemplateSeedSSI,
    buildTemplateWalletSSI,
    createTemplateSeedSSI,
    createTemplateSymmetricalEncryptionSSI,
    createTemplateWalletSSI,
    createTemplateKeySSI,
    createHashLinkSSI,
    createConstSSI,
    createArraySSI,
    buildSymmetricalEncryptionSSI,
    createToken,
    createOwnershipSSI,
    createTransferSSI,
    createTemplateTransferSSI,
    createSignedHashLinkSSI,
    createPublicKeySSI
};

},{"../anchoring":"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/index.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/index.js","key-ssi-resolver":"key-ssi-resolver"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/apisRegistry.js":[function(require,module,exports){
const apis = {};
function defineApi(name, implementation){
	if(typeof implementation !== "function"){
		throw Error("second argument of the defineApi should be a function that will represent the implementation for that api");
	}
	apis[name] = implementation;
}

function getApis(){
	return apis;
}

module.exports = {defineApi, getApis}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/defaultApis/index.js":[function(require,module,exports){
const registry = require("../apisRegistry");

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the this of the mapping will be populated with the data extracted from the DSU
* */
registry.defineApi("loadJSONS", async function (dsu, jsonIndications) {
	for (let prop in jsonIndications) {
		try {
			let data;
			data = await dsu.readFile(jsonIndications[prop]);
			this[prop] = JSON.parse(data);
		}
		catch (e){
			console.log("Failed to load JSON due to ",e.message);
		}
	}
});

/*
* based on jsonIndications Object {attributeName1: "DSU_file_path", attributeName2: "DSU_file_path"}
* the data from the this of the mapping will be saved into the DSU
* */
registry.defineApi("saveJSONS", async function (dsu, jsonIndications) {
	for (let prop in jsonIndications) {
		let data = JSON.stringify(this[prop]);
		await dsu.writeFile(jsonIndications[prop], data);
	}
});

function promisifyDSUAPIs(dsu) {
	//this API method list will be promisify on the fly with the help of the registerDSU method and a Proxy over DSU instance
	const promisifyAPIs = [
		"addFile",
		"addFiles",
		"addFolder",
		"appendToFile",
		"batch",
		"beginBatch",
		"cancelBatch",
		"cloneFolder",
		"commitBatch",
		"createFolder",
		"delete",
		"dsuLog",
		"extractFile",
		"extractFolder",
		"getKeySSI",
		"getKeySSIAsObject",
		"getKeySSIAsString",
		"getSSIForMount",
		"init",
		"listFiles",
		"listFolders",
		"listMountedDossiers",
		"load",
		"mount",
		"readDir",
		"readFile",
		"rename",
		"stat",
		"unmount",
		"writeFile",
		"listMountedDSUs",
		"refresh"
	];

	const promisifyHandler = {
		get: function (target, prop, receiver) {
			if (promisifyAPIs.indexOf(prop) !== -1) {
				return $$.promisify(target[prop]);
			}
			return target[prop];
		}
	};

	//we create a proxy over the normal DSU / Archive instance
	//in order to promisify on the fly the public API to be easier to work with in the mapping functions
	return new Proxy(dsu, promisifyHandler);
}

//all DSUs that are created with different exposed APIs need to be registered
// in order to control the batch operations and promisify the API on them
registry.defineApi("registerDSU", function (dsu) {
	if (typeof dsu === "undefined" || typeof dsu.beginBatch !== "function") {
		throw Error("registerDSU needs a DSU instance");
	}
	if (typeof this.registeredDSUs === "undefined") {
		this.registeredDSUs = [];
	}

	//TODO: temporary fix, this apiRegistry is now instantiated for each mapping message
	if(!dsu.batchInProgress()){
		this.registeredDSUs.push(dsu);
		dsu.beginBatch();
	}

	return promisifyDSUAPIs(dsu);
});

registry.defineApi("loadConstSSIDSU", async function (constSSI,options) {
	const resolver = this.getResolver();

	let dsu;
	try {
		dsu= await resolver.loadDSU(constSSI);
	}
	catch (e){
		//TODO check error type
		//on purpose if DSU does not exists an error gets throw
	}

	if (dsu) {
		//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
		return {dsu: this.registerDSU(dsu), alreadyExists: true};
	}

	dsu = await resolver.createDSUForExistingSSI(constSSI, options);

	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return {dsu: this.registerDSU(dsu), alreadyExists: false};
});

registry.defineApi("loadArraySSIDSU", async function (domain, arr) {
	const opendsu = require("opendsu");
	const resolver = this.getResolver();
	const keySSISpace = opendsu.loadApi("keyssi");

	const keySSI = keySSISpace.createArraySSI(domain, arr);
	let dsu = await resolver.loadDSU(keySSI);
	if (dsu) {
		//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
		return {dsu: this.registerDSU(dsu), alreadyExists: true};
	}

	dsu = await resolver.createArrayDSU(domain, arr);
	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return {dsu: this.registerDSU(dsu), alreadyExists: false};
});

registry.defineApi("createDSU", async function (domain, ssiType, options) {
	let dsu = await this.getResolver().createDSUx(domain, ssiType, options);
	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return this.registerDSU(dsu);
});

registry.defineApi("loadDSU", async function (keySSI, options) {
	let dsu = await this.getResolver().loadDSU(keySSI, options);
	if (!dsu) {
		throw new Error("No DSU found for " + keySSI);
	}
	//take note that this.registerDSU returns a Proxy Object over the DSU and this Proxy we need to return also
	return this.registerDSU(dsu);
});


//an api that returns an OpenDSU Resolver instance that has promisified methods
// to be used in mappings easier
registry.defineApi("getResolver", function (domain, ssiType, options) {
	const promisify = ["createDSU",
		"createDSUx",
		"createSeedDSU",
		"createArrayDSU",
		"createDSUForExistingSSI",
		"loadDSU"];

	const resolver = require("opendsu").loadApi("resolver");
	for(let i=0; i<promisify.length; i++){
		resolver[promisify[i]] = $$.promisify(resolver[promisify[i]]);
	}

	return resolver;
});


},{"../apisRegistry":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/apisRegistry.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/defaultMappings/index.js":[function(require,module,exports){
const mappingRegistry = require("./../mappingRegistry.js");

async function validateMessage(message){
	return !!(message.messageType === "standard");
}

async function digestMessage(message){
	throw Error("Not implemented yet!");
}

mappingRegistry.defineMapping(validateMessage, digestMessage);
},{"./../mappingRegistry.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/mappingRegistry.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/index.js":[function(require,module,exports){
const mappingRegistry = require("./mappingRegistry.js");
const apisRegistry = require("./apisRegistry.js");

//loading defaultApis
require("./defaultApis");

//loading defaultMappings
require("./defaultMappings");

function MappingEngine(storageService, options) {
	if (typeof storageService === "undefined"
		|| typeof storageService.beginBatch !== "function"
		|| typeof storageService.commitBatch !== "function"
		|| typeof storageService.cancelBatch !== "function") {
		throw Error("The MappingEngine requires a storage service that exposes beginBatch, commitBatch, cancelBatch apis!");
	}

	const errorHandler = require("opendsu").loadApi("error");

	//the purpose of the method is to create a "this" instance to be used during a message mapping process
	function buildMappingInstance() {
		let instance = {storageService, options};
		const apis = apisRegistry.getApis();

		//we inject all the registered apis on the instance that will become the "this" for a mapping
		for (let prop in apis) {
			if (typeof instance[prop] !== "undefined") {
				console.log(`Take note that an overwriting processing is in place for the api named ${prop}.`);
			}
			instance[prop] = (...args) => {
				return apis[prop].call(instance, ...args);
			}
		}

		return instance;
	}

	function digestMessage(message) {
		return new Promise((resolve, reject) => {

			async function process() {
				const mappings = mappingRegistry.getMappings();
				let messageDigested = false;

				for (let i = 0; i < mappings.length; i++) {
					let mapping = mappings[i];
					let {matchFunction, mappingFunction} = mapping;
					let applyMapping = await matchFunction(message);

					if (applyMapping) {
						const instance = buildMappingInstance();
						try{
							await mappingFunction.call(instance, message);


						//if all good until this point, we need to commit any registeredDSU during the message mapping
						const commitPromises = [];
						for (let i = 0; i < instance.registeredDSUs.length; i++) {
							const commitBatch = $$.promisify(instance.registeredDSUs[i].commitBatch);
							commitPromises.push(commitBatch());
						}

						Promise.all(commitPromises)
							.then(async results => {
									for (let i = 0; i < results.length; i++) {
										let result = results[i];
										if (result && result.status == "rejected") {
											registeredDSUs[i].cancelBatch();
											let getDSUIdentifier = $$.promisify(registeredDSUs[i].getKeySSIAsString);
											return reject(errorHandler.createOpenDSUErrorWrapper(`Cancel batch on dsu identified with ${await getDSUIdentifier()}`, error));
										}
									}
									resolve(true);
								}
							).catch(err => {
							return reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during commit batch on registered DSUs`, err));
						});
						}
						catch(err){
							reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during mapping`, err));
						}
						messageDigested = true;
						//we apply only the first mapping found to be suited for the message that we try to digest
						break;
					}
				}
				if (!messageDigested) {
					let messageString = JSON.stringify(message);
					const maxDisplayLength = 1024;
					console.log(`Unable to find a suitable mapping to handle the following message: ${messageString.length<maxDisplayLength?messageString:messageString.slice(0,maxDisplayLength)+"..."}`);
					reject(`Unable to find a suitable mapping to handle the messsage`);
				}
				return messageDigested;
			}

			return process();
		});
	}

	let inProgress = false;
	this.digestMessages = (messages) => {
		if (!Array.isArray(messages)) {
			messages = [messages];
		}

		async function rollback(){
			const cancelBatch = $$.promisify(storageService.cancelBatch);
			await cancelBatch();
			inProgress = false;
		}

		async function finish() {
			const commitBatch = $$.promisify(storageService.commitBatch);
			await commitBatch();
			inProgress = false;
		}

		return new Promise((resolve, reject) => {
				if (inProgress) {
					throw Error("Mapping Engine is digesting messages for the moment.");
				}
				inProgress = true;
				storageService.beginBatch();

				//digests will contain promises for each of message digest
				let digests = [];

				for (let i = 0; i < messages.length; i++) {
					let message = messages[i];
					if (typeof message !== "object") {
						throw Error(`Message is not an Object is :${typeof message} and has the value: ${message}`);
					}

					function handleErrorsDuringPromiseResolving(err) {
						reject(err);
					}

					try {
						digests.push(digestMessage(message));
					} catch (err) {
						errorHandler.reportUserRelevantError("Caught error during message digest", err);
					}

				}

			function digestConfirmation(results) {
				let failedMessages = [];
				for (let index = 0; index < results.length; index++) {
					let result = results[index];
					switch (result.status) {
						case "fulfilled" :
							if (result.value === false) {
								// message digest failed
								failedMessages.push({
									message: messages[index],
									reason: `Not able to digest message due to missing suitable mapping`
								});
							}
							break;
						case "rejected" :
							failedMessages.push({
								message: messages[index],
								reason: result.reason
							});
							break;
					}
				}

				finish().then(()=>{
					resolve(failedMessages);
				}).catch(async (err)=>{
					await rollback();
					reject(err);
				});
			}


				Promise.allSettled(digests)
				.then(digestConfirmation)
				.catch(handleErrorsDuringPromiseResolving);

			}
		);
	}

	return this;
}

module.exports = {
	getMappingEngine: function (persistenceDSU, options) {
		return new MappingEngine(persistenceDSU, options);
	},
	getMessagesPipe:function (){
		return require("./messagesPipe");
	},
	defineMapping: mappingRegistry.defineMapping,
	defineApi: apisRegistry.defineApi
}
},{"./apisRegistry.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/apisRegistry.js","./defaultApis":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/defaultApis/index.js","./defaultMappings":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/defaultMappings/index.js","./mappingRegistry.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/mappingRegistry.js","./messagesPipe":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/messagesPipe/index.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/mappingRegistry.js":[function(require,module,exports){
const mappingRegistry = [];
function defineMapping(matchFunction, mappingFunction){
	mappingRegistry.push({matchFunction, mappingFunction});
}

function getMappings(){
	return mappingRegistry;
}

module.exports = {
	defineMapping,
	getMappings
}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/messagesPipe/index.js":[function(require,module,exports){
module.exports = function (maxGroupSize, maxQueuingTime, groupingFunction) {

    this.queue = [];
    let newGroupCallback;
    let pipeIsWaiting = false;
    let waitingIntervalId;

    let startWaitingMessages = () => {
        if(pipeIsWaiting === false){
            pipeIsWaiting = true;
            waitingIntervalId = setInterval(async()=>{
                if (this.queue.length > 0) {
                    await checkPipeMessages(true);
                }
            }, maxQueuingTime);
        }
    }

    let stopWaitingMessages = () =>{
        pipeIsWaiting = false;
        if(waitingIntervalId){
            clearInterval(waitingIntervalId);
        }
    }

    this.addInQueue =  async (messages) => {

        if (!Array.isArray(messages)) {
            messages = [messages]
        }

        for (let i = 0; i < messages.length; i++) {
            this.queue.push(messages[i]);
        }

        await checkPipeMessages();

    }

    this.onNewGroup = (__newGroupCallback) => {
         newGroupCallback = __newGroupCallback;
    };

    let checkPipeMessages = async (forceFlush) =>{

        let messageGroup = await $$.promisify(groupingFunction)(this.queue);

        if (messageGroup.length < this.queue.length || maxGroupSize <= this.queue.length || forceFlush) {
            messageGroup = [...messageGroup];
            //TODO we are loosing messages that are not properly digested
            this.queue.splice(0,messageGroup.length);
            stopWaitingMessages();
            await newGroupCallback(messageGroup);
        }
        startWaitingMessages();
    }

    startWaitingMessages();

}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js":[function(require,module,exports){
const ENVIRONMENT_TYPES = require("../overwrite-require/moduleConstants");

let cachedKeySSIResolver = undefined;


module.exports = {
	ENVIRONMENT_TYPES,
	CODE_FOLDER: "/code",
	CONSTITUTION_FOLDER: '/code/constitution',
	BLOCKCHAIN_FOLDER: '/blockchain',
	APP_FOLDER: '/app',
	DOMAIN_IDENTITY_FILE: '/domain_identity',
	ASSETS_FOLDER: "/assets",
	TRANSACTIONS_FOLDER: "/transactions",
	APPS_FOLDER: "/apps",
	DATA_FOLDER: "/data",
	MANIFEST_FILE: "/manifest",
	BDNS_ROOT_HOSTS: "BDNS_ROOT_HOSTS",
	CACHE: {
		FS: "fs",
		MEMORY: "memory",
		INDEXED_DB: "cache.indexedDB",
		VAULT_TYPE: "cache.vaultType",
		BASE_FOLDER: "internal-volume/cache",
		BASE_FOLDER_CONFIG_PROPERTY: "fsCache.baseFolder",
		ENCRYPTED_BRICKS_CACHE: "encrypted-bricks-cache",
		ANCHORING_CACHE: "anchoring-cache",
		NO_CACHE: "no-cache"
	},
	DOMAINS: {
		VAULT: "vault"
	},
	VAULT:{
		BRICKS_STORE: "bricks",
		ANCHORS_STORE: "anchors"
	},
	BRICKS_DOMAIN_KEY: "bricksDomain",
	LOADER_ENVIRONMENT_JSON:{
		AGENT: "agent",
		SERVER: "server",
		VAULT: "vault",
		MOBILE: "mobile",
	},
    BOOT_CONFIG_FILE: 'boot-cfg.json',
	 get KEY_SSIS(){
		if(cachedKeySSIResolver === undefined){
			cachedKeySSIResolver = require("key-ssi-resolver");
		}
		 return cachedKeySSIResolver.SSITypes;
	 },
	get CRYPTO_FUNCTION_TYPES(){
		if(cachedKeySSIResolver === undefined){
			cachedKeySSIResolver = require("key-ssi-resolver");
		}
		return cachedKeySSIResolver.CryptoFunctionTypes;
	}
}




},{"../overwrite-require/moduleConstants":"/home/runner/work/privatesky/privatesky/modules/overwrite-require/moduleConstants.js","key-ssi-resolver":"key-ssi-resolver"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/mq/index.js":[function(require,module,exports){
/*
Message Queues API space
*/

let http = require("../http");
let bdns = require("../bdns")

function send(keySSI, message, callback) {
    bdns.getAnchoringServices(keySSI, (err, endpoints) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }
        let url = endpoints[0] + `/mq/send-message/${keySSI}`;
        let options = {body: message};

        let request = http.poll(url, options, timeout);

        request.then((response) => {
            callback(undefined, response);
        }).catch((err) => {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to send message`, err));
        });
    });
}

let requests = {};

function getHandler(keySSI, timeout) {
    let obs = require("../utils/observable").createObservable();
    bdns.getMQEndpoints(keySSI, (err, endpoints) => {
        if (err || endpoints.length === 0) {
            return callback(new Error("Not available!"));
        }

        let createChannelUrl = endpoints[0] + `/mq/create-channel/${keySSI}`;
        http.doPost(createChannelUrl, undefined, (err, response) => {
            if (err) {
                if (err.statusCode === 409) {
                    //channels already exists. no problem :D
                } else {
                    get
                    obs.dispatch("error", err);
                    return;
                }
            }

            function makeRequest() {
                let url = endpoints[0] + `/mq/receive-message/${keySSI}`;
                let options = {};

                let request = http.poll(url, options, timeout);

                request.then((response) => {
                    obs.dispatch("message", response);
                    makeRequest();
                }).catch((err) => {
                    obs.dispatch("error", err);
                });

                requests[obs] = request;
            }

            makeRequest();

        });
    });

    return obs;
}

function unsubscribe(keySSI, observable) {
    http.unpoll(requests[observable]);
}

function MQHandler(didDocument, domain) {
    let token;
    let expiryTime;
    let queueName = didDocument.getHash();
    domain = domain || didDocument.getDomain();

    function getURL(queueName, action, signature, messageID, callback) {
        let url
        if (typeof signature === "function") {
            callback = signature;
            signature = undefined;
            messageID = undefined;
        }

        if (typeof messageID === "function") {
            callback = messageID;
            messageID = undefined;
        }

        bdns.getMQEndpoints(domain, (err, mqEndpoints) => {
            if (err) {
                return callback(err);
            }

            url = `${mqEndpoints[0]}/mq/${domain}`
            switch (action) {
                case "token":
                    url = `${url}/${queueName}/token`;
                    break;
                case "get":
                    url = `${url}/get/${queueName}/${signature}`;
                    break;
                case "put":
                    url = `${url}/put/${queueName}`;
                    break;
                case "take":
                    url = `${url}/take/${queueName}/${signature}`;
                    break;
                case "delete":
                    url = `${url}/delete/${queueName}/${messageID}/${signature}`;
                    break;
                default:
                    throw Error(`Invalid action received ${action}`);
            }

            callback(undefined, url);
        })
    }

    function ensureAuth(callback) {
        getURL(queueName, "token", (err, url) => {
            if (err) {
                return callback(err);
            }

            if (!token || (expiryTime && Date.now() + 2000 > expiryTime)) {
                callback = $$.makeSaneCallback(callback);
                return http.fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        token = data.token;
                        expiryTime = data.expires;
                        callback(undefined, token);
                    })
                    .catch(err => callback(err));
            }

            callback(undefined, token);
        });
    }

    this.writeMessage = (message, callback) => {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }

            getURL(queueName, "put", (err, url) => {
                if (err) {
                    return callback(err);
                }

                http.doPut(url, message, {headers: {"Authorization": token}}, callback);
            });
        })

    }

    function consumeMessage(action, callback) {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }

            didDocument.sign(token, (err, signature) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to sign token`, err));
                }

                getURL(queueName, action, signature.toString("hex"), (err, url) => {
                    if (err) {
                        return callback(err);
                    }
                    callback = $$.makeSaneCallback(callback);
                    http.fetch(url, {headers: {Authorization: token}})
                        .then(response => response.json())
                        .then(data => callback(undefined, data))
                        .catch(err => callback(err));
                })
            })
        })
    }

    this.previewMessage = (callback) => {
        consumeMessage("get", callback);
    }

    this.readMessage = (callback) => {
        consumeMessage("take", callback);
    };

    this.deleteMessage = (messageID, callback) => {
        throw Error("Not implemented");
    }
}

function getMQHandlerForDID(didDocument, domain) {
    return new MQHandler(didDocument, domain);
}

module.exports = {
    send,
    getHandler,
    unsubscribe,
    getMQHandlerForDID
}
},{"../bdns":"/home/runner/work/privatesky/privatesky/modules/opendsu/bdns/index.js","../http":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js","../utils/observable":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/observable.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/notifications/index.js":[function(require,module,exports){
/*
KeySSI Notification API space
*/

let http = require("../http");
let bdns = require("../bdns");

function publish(keySSI, message, timeout, callback){
	if (typeof timeout === 'function') {
		callback = timeout;
		timeout = 0;
	}
	bdns.getNotificationEndpoints(keySSI.getDLDomain(), (err, endpoints) => {
		if (err) {
			throw new Error(err);
		}

		if (!endpoints.length) {
			throw new Error("No notification endpoints are available!");
		}

		let url = endpoints[0]+`/notifications/publish/${keySSI.getAnchorId()}`;

		if (typeof message !== 'string' && !$$.Buffer.isBuffer(message) && !ArrayBuffer.isView(message)) {
			message = JSON.stringify(message);
		}

        let options = {body: message, method: 'PUT'};

		let request = http.poll(url, options, timeout);

		request.then((response)=>{
			callback(undefined, response);
		}).catch((err)=>{
			return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to publish message`, err));
		});
    });
}

let requests = new Map();
function getObservableHandler(keySSI, timeout){
	timeout = timeout || 0;
	let obs = require("../utils/observable").createObservable();

	bdns.getNotificationEndpoints(keySSI.getDLDomain(), (err, endpoints) => {
		if (err) {
			throw new Error(err);
		}

		if (!endpoints.length) {
			throw new Error("No notification endpoints are available!");
		}

		function makeRequest(){
			let url = endpoints[0] + `/notifications/subscribe/${keySSI.getAnchorId()}`;
			let options = {
				method: 'POST'
			};
			let request = http.poll(url, options, timeout);

			request.then((response) => {
				obs.dispatchEvent("message", response);

				// If a subscription still exists, continue polling for messages
				if (requests.has(obs)) {
					makeRequest();
				}
			}).catch((err) => {
				obs.dispatchEvent("error", err);
			});

			requests.set(obs, request);
		}

		makeRequest();
	})

	return obs;
}

function unsubscribe(observable){
	const request = requests.get(observable);
	if (!request) {
		return;
	}
	http.unpoll(request);
	requests.delete(observable);
}

function isSubscribed(observable) {
	return requests.has(observable);
}

module.exports = {
	publish,
	getObservableHandler,
	unsubscribe,
	isSubscribed
}

},{"../bdns":"/home/runner/work/privatesky/privatesky/modules/opendsu/bdns/index.js","../http":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js","../utils/observable":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/observable.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/resolver/index.js":[function(require,module,exports){
const KeySSIResolver = require("key-ssi-resolver");
const keySSISpace = require("opendsu").loadApi("keyssi");
const cache = require("../cache");
let dsuCache = cache.getMemoryCache("DSUs");
let {ENVIRONMENT_TYPES, KEY_SSIS} = require("../moduleConstants.js");
const {getWebWorkerBootScript, getNodeWorkerBootScript} = require("./resolver-utils");

const initializeResolver = (options) => {
    options = options || {};
    return KeySSIResolver.initialize(options);
};

const registerDSUFactory = (type, factory) => {
    KeySSIResolver.DSUFactory.prototype.registerDSUType(type, factory);
};

function addDSUInstanceInCache(dsuInstance, callback) {
    dsuInstance.getKeySSIAsString((err, keySSI) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve keySSI`, err));
        }
        dsuCache.set(keySSI, dsuInstance);
        callback(undefined, dsuInstance);
    });
}

const createDSU = (templateKeySSI, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {addLog: true};
    }

    if(typeof options === "undefined"){
        options = {};
    }

    if(typeof options.addLog === "undefined"){
        options.addLog = true;
    }

    if (typeof templateKeySSI === "string") {
        try {
            templateKeySSI = keySSISpace.parse(templateKeySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${templateKeySSI}`, e));
        }
    }

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.createDSU(templateKeySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create DSU instance`, err));
        }

        function addInCache(err, result) {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create DSU instance`, err));
            }
            addDSUInstanceInCache(dsuInstance, callback);
        }
        addInCache(undefined, dsuInstance);
    });
};

const createDSUx = (domain, ssiType, options, callback) => {
    const templateKeySSI = keySSISpace.createTemplateKeySSI(ssiType, domain);
    createDSU(templateKeySSI, options, callback);
}

const createSeedDSU = (domain, options, callback) => {
    const seedSSI = keySSISpace.createTemplateSeedSSI(domain);
    createDSU(seedSSI, options, callback);
}

const createArrayDSU = (domain, arr, options, callback) => {
    const arraySSI = keySSISpace.createArraySSI(domain, arr);
    createDSUForExistingSSI(arraySSI, options, callback);
}

const createConstDSU = (domain, constString, options, callback) => {
    const constSSI = keySSISpace.createConstSSI(domain, constString);
    createDSUForExistingSSI(constSSI, options, callback);
}

const createDSUForExistingSSI = (ssi, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    options.useSSIAsIdentifier = true;
    createDSU(ssi, options, callback);
};

const loadDSU = (keySSI, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    if (typeof keySSI === "string") {
        try {
            keySSI = keySSISpace.parse(keySSI);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
        }
    }
    const ssiId = keySSI.getIdentifier();
    let fromCache = dsuCache.get(ssiId);
    if (fromCache) {
        return callback(undefined, fromCache);
    }
    const keySSIResolver = initializeResolver(options);
    // const sc = require("../sc").getSecurityContext();
    // sc.registerKeySSI(keySSI);
    keySSIResolver.loadDSU(keySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU`, err));
        }
        addDSUInstanceInCache(dsuInstance, callback);
    });
};

/*
    boot the DSU in a thread
 */
const getDSUHandler = (dsuKeySSI) => {
    if (typeof dsuKeySSI === "string") {
        // validate the dsuKeySSI to ensure it's valid
        try {
            keySSISpace.parse(dsuKeySSI);
        } catch (error) {
            const errorMessage = `Cannot parse keySSI ${dsuKeySSI}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    const syndicate = require("syndicate");

    function DSUHandler() {
        switch ($$.environmentType) {
            case ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                throw new Error(`service-worker environment is not supported!`);
            case ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (!window.Worker) {
                    throw new Error("Current environment does not support Web Workers!");
                }

                console.log("[Handler] starting web worker...");

                let blobURL = getWebWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: blobURL,
                    maximumNumberOfWorkers: 1,
                    workerStrategy: syndicate.WorkerStrategies.WEB_WORKERS,
                });

                setTimeout(() => {
                    // after usage, the blob must be removed in order to avoit memory leaks
                    // it requires a timeout in order for syndicate to be able to get the blob script before it's removed
                    URL.revokeObjectURL(blobURL);
                });

                break;
            case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE: {
                console.log("[Handler] starting node worker...");

                const script = getNodeWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: script,
                    maximumNumberOfWorkers: 1,
                    workerOptions: {
                        eval: true,
                    },
                });

                break;
            }
            default:
                throw new Error(`Unknown environment ${$$.environmentType}!`);
        }

        const sendTaskToWorker = (task, callback) => {
            workerPool.addTask(task, (err, message) => {
                if (err) {
                    return callback(err);
                }

                let {error, result} =
                    typeof Event !== "undefined" && message instanceof Event ? message.data : message;

                if (error) {
                    return callback(error);
                }

                if (result) {
                    if (result instanceof Uint8Array) {
                        // the buffers sent from the worker will be converted to Uint8Array when sending to parent
                        result = Buffer.from(result);
                    } else {
                        try {
                            result = JSON.parse(result);
                        } catch (error) {
                            // if parsing fails then the string must be an ordinary one so we leave it as it is
                        }
                    }
                }

                callback(error, result);
            });
        };

        this.callDSUAPI = function (fn, ...args) {
            const fnArgs = [...args];
            const callback = fnArgs.pop();

            const parseResult = (error, result) => {
                if (error) {
                    return callback(error);
                }

                // try to recreate keyssi
                try {
                    result = keySSISpace.parse(result);
                } catch (error) {
                    // if it fails, then the result is not a valid KeySSI
                }
                callback(undefined, result);
            };

            sendTaskToWorker({fn, args: fnArgs}, parseResult);
        };

        this.callApi = function (fn, ...args) {
            const apiArgs = [...args];
            const callback = apiArgs.pop();
            sendTaskToWorker({api: fn, args: apiArgs}, callback);
        };
    }

    let res = new DSUHandler();
    let availableFunctions = [
        "addFile",
        "addFiles",
        "addFolder",
        "appendToFile",
        "createFolder",
        "delete",
        //"extractFile",
        //"extractFolder",
        "listFiles",
        "listFolders",
        "mount",
        "readDir",
        "readFile",
        "rename",
        "unmount",
        "writeFile",
        "listMountedDSUs",
        "beginBatch",
        "commitBatch",
        "cancelBatch",
    ];

    function getWrapper(functionName) {
        return function (...args) {
            res.callDSUAPI(functionName, ...args);
        }.bind(res);
    }

    for (let f of availableFunctions) {
        res[f] = getWrapper(f);
    }

    return res;
};

const getRemoteHandler = (dsuKeySSI, remoteURL, presentation) => {
    throw Error("Not available yet");
};

function invalidateDSUCache(dsuKeySSI) {
    let ssiId = dsuKeySSI;
    if (typeof dsuKeySSI != "string") {
        ssiId = dsuKeySSI.getIdentifier();
    }
    delete dsuCache.set(ssiId, undefined);
}

module.exports = {
    createDSU,
    createDSUx,
    createSeedDSU,
    createConstDSU,
    createArrayDSU,
    createDSUForExistingSSI,
    loadDSU,
    getDSUHandler,
    registerDSUFactory,
    invalidateDSUCache,
};

},{"../cache":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js","../moduleConstants.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./resolver-utils":"/home/runner/work/privatesky/privatesky/modules/opendsu/resolver/resolver-utils.js","key-ssi-resolver":"key-ssi-resolver","opendsu":"opendsu","syndicate":false}],"/home/runner/work/privatesky/privatesky/modules/opendsu/resolver/resolver-utils.js":[function(require,module,exports){
function getWebWorkerBootScript(dsuKeySSI) {
    const scriptLocation = document.currentScript
        ? document.currentScript
        : new Error().stack.match(/([^ ^(\n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/gi)[0];
    let blobURL = URL.createObjectURL(
        new Blob(
            [
                `
                (function () {
                    importScripts("${scriptLocation}");
                    require("opendsu").loadApi("boot")("${dsuKeySSI}");                                    
                })()
                `,
            ],
            { type: "application/javascript" }
        )
    );
    return blobURL;
}

function getNodeWorkerBootScript(dsuKeySSI) {
    const openDSUScriptPath = global.bundlePaths.openDSU.replace(/\\/g, "\\\\").replace(".js", "");
    const script = `require("${openDSUScriptPath}");require('opendsu').loadApi('boot')('${dsuKeySSI}')`;
    return script;
}

module.exports = {
    getWebWorkerBootScript,
    getNodeWorkerBootScript,
};

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/sc/index.js":[function(require,module,exports){
/*
    Security Context related functionalities

 */

const getMainDSU = () => {
    if (!globalVariableExists("rawDossier")) {
        throw Error("Main DSU does not exist in the current context.");
    }
    return getGlobalVariable("rawDossier");
};

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

function SecurityContext(keySSI) {
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")

    const DB_NAME = "security_context";
    const KEY_SSIS_TABLE = "keyssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const DIDS_PUBLIC_KEYS = "dids_public";

    let isInitialized = false;

    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }

    let storageDB = db.getWalletDB(keySSI, DB_NAME);


    this.registerDID = (didDocument, callback) => {
        let privateKeys = didDocument.getPrivateKeys();
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys]
        }
        storageDB.getRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), {privateKeys: privateKeys}, callback);
            }

            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            storageDB.updateRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
        });
    };

    this.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        const privateKeyObj = {privateKeys: [privateKey]}
        storageDB.getRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), privateKeyObj, callback);
            }

            res.privateKeys.push(privateKey);
            storageDB.updateRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    this.addPublicKeyForDID = (didDocument, publicKey, callback) => {
        const publicKeyObj = {publicKeys: [publicKey]}
        storageDB.getRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), publicKeyObj, callback);
            }

            res.publicKeys.push(publicKey);
            return storageDB.updateRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    this.getPrivateInfoForDID = (did, callback) => {
        storageDB.getRecord(DIDS_PRIVATE_KEYS, did, (err, record) => {
            if (err) {
                return callback(err);
            }

            const privateKeysAsBuff = record.privateKeys.map(privateKey => {
                if(privateKey){
                    return $$.Buffer.from(privateKey)
                }

                return privateKey;
            });
            callback(undefined, privateKeysAsBuff);
        });
    };

    this.registerKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "undefined") {
            return callback(Error(`A SeedSSI should be specified.`));
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        const keySSIIdentifier = keySSI.getIdentifier();

        function registerDerivedKeySSIs(derivedKeySSI) {
            storageDB.insertRecord(KEY_SSIS_TABLE, derivedKeySSI.getIdentifier(), {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
                if (err) {
                    return callback(err);
                }

                try {
                    derivedKeySSI = derivedKeySSI.derive();
                } catch (e) {
                    return callback();
                }

                registerDerivedKeySSIs(derivedKeySSI);
            });
        }

        return registerDerivedKeySSIs(keySSI);
    };

    this.getCapableOfSigningKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "undefined") {
            return callback(Error(`A SeedSSI should be specified.`));
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        storageDB.getRecord(KEY_SSIS_TABLE, keySSI.getIdentifier(), (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`No capable of signing keySSI found for keySSI ${keySSI.getIdentifier()}`, err));
            }

            let keySSI;
            try {
                keySSI = keySSISpace.parse(record.capableOfSigningKeySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${record.capableOfSigningKeySSI}`, e))
            }

            callback(undefined, keySSI);
        });
    };

    this.getKeySSI = (keySSI) => {
        if (typeof keySSI === "undefined") {
            throw Error(`A KeySSI should be specified.`)
        }

        if (typeof keySSI !== "string") {
            keySSI = keySSI.getIdentifier();
        }

        return keySSISpace.parse(keySSIs[keySSI]);
    };

    this.sign = (keySSI, data, callback) => {
        // temporary solution until proper implementation
        return callback(undefined, {signature: "", publicKey: ""});
        if (!isInitialized) {
            return this.addPendingCall(() => {
                this.sign(keySSI, data, callback);
            });
        }

        const powerfulKeySSI = this.getKeySSI(keySSI);
        crypto.sign(powerfulKeySSI, data, callback);
    }

    this.signAsDID = (didDocument, data, callback) => {
        this.getPrivateInfoForDID(didDocument.getIdentifier(), (err, privateKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didDocument.getIdentifier()}`, err));
            }
            didDocument.signImpl(privateKey, data, callback);
        });
    }

    this.verifyForDID = (didDocument, data, signature, callback) => {
        didDocument.verifyImpl(data, signature, callback);
    }


    this.encryptForDID = (senderDIDDocument, receiverDIDDocument, message, callback) => {
        this.getPrivateInfoForDID(senderDIDDocument.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${senderDIDDocument.getIdentifier()}`, err));
            }

            senderDIDDocument.encryptMessageImpl(privateKeys, receiverDIDDocument, message, callback);
        });
    };

    this.decryptAsDID = (didDocument, encryptedMessage, callback) => {
        this.getPrivateInfoForDID(didDocument.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didDocument.getIdentifier()}`, err));
            }

            didDocument.decryptMessageImpl(privateKeys, encryptedMessage, callback);
        });
    };

    return this;
}

const getSecurityContext = (keySSI) => {
    if (typeof $$.sc === "undefined") {
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        if (typeof keySSI === "undefined") {
            //TODO get sc from main dsu
            // throw Error(`A keySSI should be provided.`)
            keySSI = keySSISpace.createSeedSSI("default");
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e);
            }
        }

        $$.sc = new SecurityContext(keySSI);
    }

    return $$.sc;
};
module.exports = {
    getMainDSU,
    setMainDSU,
    getSecurityContext
};

},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/system/index.js":[function(require,module,exports){
const envVariables = {};
function getEnvironmentVariable(name){
    if (typeof envVariables[name] !== "undefined") {
        return envVariables[name];
    }
    return process.env[name];
}
function setEnvironmentVariable(name, value){
    envVariables[name] = value;
}

function getFS(){
    const fsName = "fs";
    return require(fsName);
}

function getPath(){
    const pathName = "path";
    return require(pathName);
}

module.exports = {
    getEnvironmentVariable,
    setEnvironmentVariable,
    getFS,
    getPath
}
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/BindAutoPendingFunctions.js":[function(require,module,exports){
const PendingCallMixin = require("./PendingCallMixin");
/*
    Utility to make classes that depend on some initialisation easier to use.
    By using the PendingCallMixin, the member function can be used but will be called in order only after proper initialisation
 */

module.exports.bindAutoPendingFunctions = function(obj, exceptionList){
    let originalFunctions = {};

    for(let m in obj){
        if(typeof obj[m] == "function"){
            if(!exceptionList || exceptionList.indexOf(m) === -1){
                originalFunctions[m] = obj[m];
            }
        }
    }
    PendingCallMixin(obj);
    let isInitialised = false;

    obj.finishInitialisation = function(){
        isInitialised = true;
        obj.executeSerialPendingCalls();
    };

   function getWrapper(func){
       return function(...args){
           if(isInitialised){
              return func(...args);
           } else {
               obj.addSerialPendingCall( function(next){
                   let callback = args[args.length -1];
                   if(typeof callback === "function"){
                       args[args.length -1] = function(...args){
                           callback(...args);
                           next();
                       }
                   } else {
                       next();
                   }
                  return func(...args);
               })
           }
       }.bind(obj);
   }

    for(let m in originalFunctions){
        obj[m] = getWrapper(originalFunctions[m]);
    }
    return obj;
};

},{"./PendingCallMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/ObservableMixin.js":[function(require,module,exports){
function ObservableMixin(target) {
    let observers = {};

    target.on = function(eventType, callback){
        let arr = observers[eventType];
        if(!arr){
            arr = observers[eventType] = [];
        }
        arr.push(callback);
    }

    target.off = function(eventType, callback){
        let arr = observers[eventType];
        if(!arr){
            //nothing to do...
            reportDevRelevantInfo("Off-ing an unknown observer");
            return;
        }
        let index = observers[eventType].indexOf(callback);
        if(index === -1){
            reportDevRelevantInfo("Observer not found into the list of known observers.");
            return;
        }

        observers[eventType].splice(index, 1);
    }

    target.dispatchEvent = function(eventType, message){
        let arr = observers[eventType];
        if(!arr){
            //no handlers registered
            reportDevRelevantInfo(`No observers found for event type ${eventType}`);
            return;
        }

        arr.forEach( c => {
            try{
                c(message);
            }catch(err){
				console.error(err);
                reportDevRelevantInfo(`Caught an error during the delivery of ${eventType} to ${c.toString()}`);
            }

        });
    }

    target.removeAllObservers = function (eventType){
        if(observers[eventType]){
            delete observers[eventType];
        } else {
            reportDevRelevantInfo("No observers found in the list of known observers.");
        }
    }
}

module.exports = ObservableMixin;

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/PendingCallMixin.js":[function(require,module,exports){
function PendingCallMixin(target) {
    let pendingCalls = [];
    let serialPendingCalls = [];
    let isSerialExecutionReady = false;
    let isExecutionReady = false;
    target.addPendingCall = (pendingFn) => {
        if (isExecutionReady) {
            pendingFn();
        } else {
            pendingCalls.push(pendingFn);
        }
    };

    target.executePendingCalls = () => {
        isExecutionReady = true;
        pendingCalls.forEach(fn => fn());
        pendingCalls = [];
    };

    target.addSerialPendingCall = (pendingFn) => {
        serialPendingCalls.push(pendingFn);
        if (isSerialExecutionReady) {
            next();
        }
    };

    function next() {
        const fn = serialPendingCalls.shift();
        if (typeof fn !== "undefined") {
            try {
                fn(function () {
                    setTimeout(() => {
                        next();
                    }, 0);
                });
            } catch (e) {
                console.log(e);
            }
        }
    }

    target.executeSerialPendingCalls = () => {
        isSerialExecutionReady = true;
        next();
    };
}

module.exports = PendingCallMixin;
},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/array.js":[function(require,module,exports){
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports.shuffle = shuffle;

},{}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/getBaseURL.js":[function(require,module,exports){
const constants = require("../moduleConstants");
const system = require("../system");
function getBaseURL(){
    switch ($$.environmentType) {
        case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
            let scope = self.registration.scope;

            let parts = scope.split("/");
            return `${parts[0]}//${parts[2]}`;

        case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:            
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const port = window.location.port;

            return `${protocol}//${host}:${port}`;

        case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:            
            return self.location.origin;

        case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            let baseUrl = system.getEnvironmentVariable(constants.BDNS_ROOT_HOSTS);
            if (typeof baseUrl === "undefined") {
                baseUrl = "http://localhost:8080";
            } else {
                const myURL = new URL(baseUrl);
                baseUrl = myURL.origin;
            }
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.slice(0, -1);
            }
            return baseUrl;

        default:
    }
}

module.exports = getBaseURL;
},{"../moduleConstants":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","../system":"/home/runner/work/privatesky/privatesky/modules/opendsu/system/index.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/observable.js":[function(require,module,exports){
module.exports.createObservable = function(){
	let observableMixin = require("./ObservableMixin");
	let obs = {};

	observableMixin(obs);
	return obs;
}
},{"./ObservableMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/ObservableMixin.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/promise-runner.js":[function(require,module,exports){
const arrayUtils = require("./array");

function validateMajorityRunAllWithSuccess(successResults, errorResults, totalCount) {
  const successCount = successResults.length;
  const errorCount = errorResults.length;

  if (totalCount == null) {
    // totalCount was not provided, so we consider to be the sum of the other results
    totalCount = successCount + errorCount;
  }

  const isMajorityWithSuccess = successCount >= Math.ceil(totalCount / 2);
  return isMajorityWithSuccess;
}

function runSinglePromise(executePromise, promiseInput) {
  return executePromise(promiseInput)
    .then((result) => {
      return {
        success: true,
        result,
      };
    })
    .catch((error) => {
      return {
        error,
      };
    });
}

function runAll(listEntries, executeEntry, validateResults, callback, debugInfo) {
  if (typeof validateResults !== "function") {
    validateResults = validateMajorityRunAllWithSuccess;
  }

  const allInitialExecutions = listEntries.map((entry) => {
    return runSinglePromise(executeEntry, entry);
  });
  Promise.all(allInitialExecutions)
    .then((results) => {
      const successExecutions = results.filter((run) => run.success);
      let errorExecutions = results.filter((run) => !run.success);
      errorExecutions = errorExecutions.map(e => {
        if (e.error && e.error.error) {
          return e.error.error;
        }else {
          return e;
        }
      });
      const isConsideredSuccessfulRun = validateResults(successExecutions, errorExecutions);
      if (isConsideredSuccessfulRun) {
        const successExecutionResults = successExecutions.map((run) => run.result);
        return callback(null, successExecutionResults);
      }

      let baseError = debugInfo;
      if(errorExecutions.length){
        if(baseError){
          baseError = createOpenDSUErrorWrapper("Error found during runAll", errorExecutions[0], errorExecutions, debugInfo);
        }
      }
      return callback(createOpenDSUErrorWrapper("FAILED to runAll " , baseError));
    })
    .catch(( error) => {
      callback(error)
    });
}

function runOneSuccessful(listEntries, executeEntry, callback, debugInfo) {
  if (!listEntries.length) {
    return callback("EMPTY_LIST");
  }

  availableListEntries = [...listEntries];
  arrayUtils.shuffle(availableListEntries);

  const entry = availableListEntries.shift();

  const executeForSingleEntry = (entry) => {
    return executeEntry(entry)
      .then((result) => {
        return callback(null, result);
      })
      .catch((err) => {
        if (!availableListEntries.length) {
          return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to execute entry`, err));
        }

        const nextEntry = availableListEntries.shift();
        executeForSingleEntry(nextEntry);
      });
  };

  executeForSingleEntry(entry);
}

function runEnoughForMajority(listEntries, executeEntry, initialRunCount, validateResults, callback, debugInfo) {
  const totalCount = listEntries.length;

  if (!initialRunCount || typeof initialRunCount !== "number") {
    // no initiaRunCount was specified, so we execute half of them initially
    initialRunCount = Math.ceil(totalCount / 2);
  }
  initialRunCount = Math.min(initialRunCount, totalCount);

  if (typeof validateResults !== "function") {
    validateResults = validateMajorityRunAllWithSuccess;
  }

  let allExecutedRunResults = [];
  const initialEntries = listEntries.slice(0, initialRunCount);
  const remainingEntries = listEntries.slice(initialRunCount);

  const checkAllExecutedRunResults = () => {
    const successExecutions = allExecutedRunResults.filter((run) => run.success);
    const errorExecutions = allExecutedRunResults.filter((run) => !run.success);

    const isConsideredSuccessfulRun = validateResults(successExecutions, errorExecutions, totalCount);
    if (isConsideredSuccessfulRun) {
      const successExecutionResults = successExecutions.map((run) => run.result);
      return callback(null, successExecutionResults);
    }

    if (!remainingEntries.length) {
      // the results weren't validated, but we don't have any other entry to run
      return callback(new Error("FAILED to run enough in majority"+debugInfo));
    }

    const nextEntry = remainingEntries.shift();
    runSinglePromise(executeEntry, nextEntry)
      .then((nextEntryResult) => {
        allExecutedRunResults.push(nextEntryResult);
        checkAllExecutedRunResults();
      })
      .catch(() => {
        // runSinglePromise already makes sure no catch is thrown
        // put to ignore nodejs unhandled execution warning
      });
  };

  const allInitialExecutions = initialEntries.map((entry) => {
    return runSinglePromise(executeEntry, entry);
  });

  Promise.all(allInitialExecutions)
    .then((results) => {
      allExecutedRunResults = results;
      checkAllExecutedRunResults();
    })
    .catch((error) => callback(error));
}

module.exports = {
  runAll,
  runOneSuccessful,
  runEnoughForMajority,
};

},{"./array":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/array.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/W3CDID_Mixin.js":[function(require,module,exports){
/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(target) {

    const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();
    const keySSISpace = require("opendsu").loadAPI("keyssi");
    const crypto = require("opendsu").loadAPI("crypto");
    target.findPrivateKeysInSecurityContext = function (callback) {

    };

    target.sign = function (hash, callback) {
        securityContext.signAsDID(target, hash, callback);
    };

    target.verify = function (hash, signature, callback) {
        securityContext.verifyForDID(target, hash, signature, callback);
    };

    target.signImpl = (privateKeys, data, callback) => {
        const keySSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        keySSI.initialize(keySSI.getDLDomain(), privateKeys[0]);
        crypto.sign(keySSI, data, callback);
    };

    target.verifyImpl = (data, signature, callback) => {
        target.getPublicKey("pem", (err, publicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            const templateKeySSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
            crypto.verifySignature(templateKeySSI, data, signature, publicKey, callback);
        });
    }
    /*Elliptic Curve Integrated Encryption Scheme
    * https://github.com/bin-y/standard-ecies/blob/master/main.js
    * https://www.npmjs.com/package/ecies-lite  //try to use functions from SSI and from crypto
    * https://github.com/ecies/js
    * https://github.com/sigp/ecies-parity
    * https://github.com/pedrouid/eccrypto-js
    *
    * annoncrypt  - symertric enc (IES)
    * authcrypt   -  asymetric enc + sign
    * plaintext   + asym sign
    *
    * A -> B   sign(enc( ASYM_PK_B, M), PK_A)
    * */

    target.encryptMessage = function (receiverDID, message, callback) {
        securityContext.encryptForDID(target, receiverDID, message, callback);
    };

    target.decryptMessage = function (encryptedMessage, callback) {
        securityContext.decryptAsDID(target, encryptedMessage, callback);
    };

    const saveNewKeyPairInSC = async (didDocument, compatibleSSI) => {
        try {
            await $$.promisify(securityContext.addPrivateKeyForDID)(didDocument, compatibleSSI.getPrivateKey("raw"));
            await $$.promisify(securityContext.addPublicKeyForDID)(didDocument, compatibleSSI.getPublicKey("raw"));
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to save new private key and public key in security context`, e);
        }

        try {
            await $$.promisify(didDocument.addPublicKey)(compatibleSSI.getPublicKey("raw"));
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to save new private key and public key in security context`, e);
        }
    };

    target.encryptMessageImpl = function (privateKeys, receiverDIDDocument, message, callback) {
        const senderSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        senderSeedSSI.initialize(target.getDomain(), privateKeys[0]);

        receiverDIDDocument.getPublicKey("raw", async (err, receiverPublicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get sender publicKey`, err));
            }

            const publicKeySSI = keySSISpace.createPublicKeySSI("seed", receiverPublicKey);

            const encryptMessage = (senderKeySSI) => {
                let encryptedMessage;
                try {
                    encryptedMessage = crypto.ecies_encrypt_ds(senderKeySSI, publicKeySSI, message);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to encrypt message`, e));
                }

                callback(undefined, encryptedMessage);
            }

            let compatibleSSI;
            try {
                compatibleSSI = await $$.promisify(publicKeySSI.generateCompatiblePowerfulKeySSI)();
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to create compatible seed ssi`, e));
            }

            try {
                await saveNewKeyPairInSC(target, compatibleSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to save compatible seed ssi`, e));
            }

            encryptMessage(compatibleSSI);
        });
    };

    target.decryptMessageImpl = function (privateKeys, encryptedMessage, callback) {
        let decryptedMessageObj;
        const decryptMessageRecursively = (privateKeyIndex) => {
            const privateKey = privateKeys[privateKeyIndex];
            if (typeof privateKey === "undefined") {
                return callback(createOpenDSUErrorWrapper(`Failed to decrypt message`, Error(`Private key is undefined`)));
            }

            const receiverSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
            receiverSeedSSI.initialize(target.getDomain(), privateKey);
            try {
                decryptedMessageObj = crypto.ecies_decrypt_ds(receiverSeedSSI, encryptedMessage);
            } catch (e) {
                return decryptMessageRecursively(privateKeyIndex + 1);
            }

            callback(undefined, decryptedMessageObj.message.toString());
        }

        decryptMessageRecursively(0);
    };

    /* messages to the APiHUb MQ compatible APIs

    * */

    target.getHash = () => {
        return crypto.sha256(target.getIdentifier());
    };

    target.sendMessage = function (message, toOtherDID, callback) {
        const mqHandler = require("opendsu").loadAPI("mq").getMQHandlerForDID(toOtherDID);
        target.encryptMessage(toOtherDID, message, (err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to encrypt message`, err));
            }

            mqHandler.writeMessage(JSON.stringify(encryptedMessage), callback);
        });
    };

    target.readMessage = function (callback) {
        const mqHandler = require("opendsu").loadAPI("mq").getMQHandlerForDID(target);
        mqHandler.readMessage((err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read message`, err));
            }

            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
              return callback(e);
            }
            target.decryptMessage(message, callback);
        });
    };

    target.on = function (callback) {

    };

    target.revokeDID = function (callback) {

    };

    target.revokeKey = function (key, callback) {

    };

    target.getControllerKey = function (callback) {

    };

    target.getPublicKeys = function (callback) {

    };

}

module.exports = W3CDID_Mixin;

},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/demo/diddemo.js":[function(require,module,exports){


function DemoPKDocument(identifier){
    let mixin =  require("../W3CDID_Mixin");
    mixin(this);

    this.sign = function(hash, callback){
        return hash;
    };

    this.verify = function(hash, signature, callback){
        callback(undefined, hash == signature);
    };

    let domainName;

    this.setDomain = function(name) {
        domainName = name;
    }

    function getApiHubEndpoint() {
        return new Promise(async (resolve, reject) => {
            const opendsu = require("opendsu");
            const getBaseURL = require("../../utils/getBaseURL");
            const consts = opendsu.constants;
            const system = opendsu.loadApi("system");
            // return system.getEnvironmentVariable(consts.BDNS_ROOT_HOSTS);
            if (domainName) {
                const bdns = opendsu.loadApi('bdns');
                try {
                    let mqArray = await $$.promisify(bdns.getMQEndpoints)(domainName);
                    if (mqArray.length > 0) {
                        return resolve(mqArray[0]);
                    }
                } catch (e) {
                    resolve(getBaseURL());
                }
            }
            resolve(getBaseURL());
        });
    }

    this.sendMessage = async (message, toOtherDID, callback) => {
        const opendsu = require("opendsu");
        const http = opendsu.loadApi("http");
        let apiHubEndpoint = await getApiHubEndpoint();
        let url = `${apiHubEndpoint}/mq/send-message/${encodeURI(toOtherDID)}`;
        let options = message;

        let request = http.doPost(url, options, (err, response) => {
            if (err) {
                return callback(OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to send message`, err)));
            }

            return callback();
        });
    };

    this.readMessage = async (callback) => {
        const endpoint = await getApiHubEndpoint();
        const opendsu = require("opendsu");
        const http = opendsu.loadApi("http");
        let didIdentifier = this.getIdentifier();
        let createChannelUrl = `${endpoint}/mq/create-channel/${encodeURI(didIdentifier)}`;
        http.doPost(createChannelUrl, "", (err, response) => {
            if (err) {
                if (err.statusCode === 409) {
                    //channels already exists. no problem :D
                } else {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create channel for DID ${didIdentifier}`, err));
                }
            }

            function makeRequest() {
                let url = `${endpoint}/mq/receive-message/${encodeURI(didIdentifier)}`;
                let options = {};

                let request = http.poll(url, options);

                request.then((response) => {
                    return response.text();
                }).then((message) => {
                    return callback(undefined, message);
                }).catch((err) => {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Unable to read message`, err));
                });
            }

            makeRequest();
        });
    };

    this.getIdentifier = function(){
        return `did:demo:${identifier}`;
    }

    return this;
}

function DEMO_DIDMethod(){
    let aliasDocument = require("../proposals/aliasDocument");
    this.create = function(identifier, callback){
        callback(null, new DemoPKDocument(identifier));
    }

    this.resolve = function(tokens, callback){
        callback(null, new DemoPKDocument(tokens[2]));
    }
}

module.exports.create_demo_DIDMethod = function(){
    return new DEMO_DIDMethod();
}
},{"../../utils/getBaseURL":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/getBaseURL.js","../W3CDID_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/W3CDID_Mixin.js","../proposals/aliasDocument":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/proposals/aliasDocument.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ConstDID_Document_Mixin.js":[function(require,module,exports){
function ConstDID_Document_Mixin(target, domain, name) {
    let mixin = require("../W3CDID_Mixin");
    const observableMixin = require("../../utils/ObservableMixin")
    mixin(target);
    observableMixin(target);

    const openDSU = require("opendsu");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    const error = openDSU.loadAPI("error");
    const crypto = openDSU.loadAPI("crypto");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");

    const WRITABLE_DSU_PATH = "writableDSU";
    const PUB_KEYS_PATH = "publicKeys";

    const generatePublicKey = async () => {
        let seedSSI;
        try {
            seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create SeedSSI`, e);
        }

        target.privateKey = seedSSI.getPrivateKey();
        return seedSSI.getPublicKey("raw");
    };

    const createDSU = async () => {
        let constDSU;
        try {
            constDSU = await $$.promisify(resolver.createConstDSU)(domain, name);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create constDSU`, e);
        }

        try {
            target.dsu = await $$.promisify(resolver.createSeedDSU)(domain);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create writableDSU`, e);
        }

        let publicKey = await generatePublicKey();
        try {
            await $$.promisify(target.addPublicKey)(publicKey);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to save public key`, e);
        }
        let seedSSI;
        try {
            seedSSI = await $$.promisify(target.dsu.getKeySSIAsString)();
        } catch (e) {
            return error.reportUserRelevantError(`Failed to get seedSSI`, e);
        }

        try {
            await $$.promisify(constDSU.mount)(WRITABLE_DSU_PATH, seedSSI);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to mount writable DSU`, e);
        }

        target.finishInitialisation();
        target.dispatchEvent("initialised");
    };

    target.init = () => {
        resolver.loadDSU(keySSISpace.createConstSSI(domain, name), async (err, constDSUInstance) => {
            if (err) {
                try {
                    await createDSU(domain, name);
                } catch (e) {
                    return error.reportUserRelevantError(`Failed to create DSU`, e);
                }
                return;
            }

            try {
                const dsuContext = await $$.promisify(constDSUInstance.getArchiveForPath)(WRITABLE_DSU_PATH);
                target.dsu = dsuContext.archive;
            } catch (e) {
                return error.reportUserRelevantError(`Failed to load writableDSU`, e);
            }

            target.finishInitialisation();
            target.dispatchEvent("initialised");
        });
    }

    target.getPrivateKeys = () => {
        return [target.privateKey];
    };

    target.getPublicKey = (format, callback) => {
        target.dsu.listFiles(PUB_KEYS_PATH, (err, pubKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            let pubKey = Buffer.from(pubKeys[pubKeys.length - 1], "hex");
            if (format === "raw") {
                return callback(undefined, pubKey);
            }

            try {
                pubKey = crypto.convertPublicKey(pubKey, format);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to convert raw public key to pem`, e));
            }

            callback(undefined, pubKey);
        });
    };

    target.getDomain = () => {
        return domain;
    };

    target.addPublicKey = (publicKey, callback) => {
        target.dsu.writeFile(`${PUB_KEYS_PATH}/${publicKey.toString("hex")}`, callback);
    }
}

module.exports = ConstDID_Document_Mixin;

},{"../../utils/ObservableMixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/ObservableMixin.js","../W3CDID_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/W3CDID_Mixin.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/GroupDID_Document.js":[function(require,module,exports){
function GroupDID_Document(domain, groupName) {
    if (typeof domain === "undefined" || typeof groupName === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

    let mixin = require("./ConstDID_Document_Mixin");
    mixin(this, domain, groupName);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    const openDSU = require("opendsu");
    const MEMBERS_FILE = "members";

    this.addMember = (identity, alias, callback) => {
        if (typeof alias === "function") {
            callback = alias;
            alias = identity;
        }
        updateMembers("add", [identity], [alias], callback);
    };

    this.addMembers = (identities, aliases, callback) => {
        updateMembers("add", identities, aliases, callback);
    };

    this.removeMember = (identity, callback) => {
        updateMembers("remove", [identity], callback);
    };

    this.removeMembers = (identities, callback) => {
        updateMembers("remove", identities, callback);
    };

    this.listMembersByAlias = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.values(members));
        });
    };

    this.listMembersByIdentity = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.keys(members));
        });
    };

    this.getMemberIdentity = (alias, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const member = Object.keys(members).find(identifier => members[identifier] === alias);
            if (typeof member === "undefined") {
                return callback(Error(`Failed to find member with alias ${alias}`));
            }
            callback(undefined, Object.keys(member)[0]);
        });
    };

    this.getMemberAlias = (identity, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const memberAlias = members[identity];
            if (typeof memberAlias === "undefined") {
                return callback(Error(`Failed to find member with id ${identity}`));
            }
            callback(undefined, memberAlias);
        });
    };

    this.getIdentifier = () => {
        return `did:ssi:group:${domain}:${groupName}`;
    };

    this.getGroupName = () => {
        return groupName;
    };

    this.sendMessage = (message, callback) => {
        const w3cDID = openDSU.loadAPI("w3cdid");
        readMembers(async (err, members) => {
            if (err) {
                return callback(err);
            }

            let senderDIDDocument;
            try {
                senderDIDDocument = await $$.promisify(w3cDID.resolveDID)(message.getSender());
            } catch (e) {
                return callback(e);
            }

            const membersIds = Object.keys(members);
            const noMembers = membersIds.length;

            let counter = noMembers - 1;
            for (let i = 0; i < noMembers; i++) {
                if (membersIds[i] !== message.getSender()) {
                    try {
                        const receiverDIDDocument = await $$.promisify(w3cDID.resolveDID)(membersIds[i]);
                        await $$.promisify(senderDIDDocument.sendMessage)(message.getSerialisation(), receiverDIDDocument)
                    } catch (e) {
                        return callback(e);
                    }

                    counter--;
                    if (counter === 0) {
                        return callback();
                    }
                }
            }
        });
    };

    const readMembers = (callback) => {
        this.dsu.readFile(MEMBERS_FILE, (err, members) => {
            if (err || typeof members === "undefined") {
                members = {};
            } else {
                try {
                    members = JSON.parse(members.toString());
                } catch (e) {
                    return callback(e);
                }
            }

            callback(undefined, members);
        });
    };

    const updateMembers = (operation, identities, aliases, callback) => {
        if (typeof aliases === "function") {
            callback = aliases;
            aliases = identities;
        }

        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            if (operation === "remove") {
                identities.forEach(id => {
                    if (typeof members[id] !== "undefined") {
                        delete members[id];
                    }
                });

                return this.dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else if (operation === "add") {
                identities.forEach((id, index) => {
                    if (typeof members[id] === "undefined") {
                        members[id] = aliases[index]
                    }
                });
                return this.dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else {
                callback(Error(`Invalid operation ${operation}`));
            }
        });
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getGroupName", "on", "off", "addPublicKey"]);
    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (domain, groupName) {
        return new GroupDID_Document(domain, groupName)
    },
    createDIDDocument: function (tokens) {
        return new GroupDID_Document(tokens[3], tokens[4]);
    }
};

},{"../../utils/BindAutoPendingFunctions":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/BindAutoPendingFunctions.js","./ConstDID_Document_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ConstDID_Document_Mixin.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/KeyDID_Document.js":[function(require,module,exports){
function KeyDID_Document(isInitialisation, seedSSI) {
    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    let tokens;
    if (!isInitialisation) {
        tokens = seedSSI;
        seedSSI = undefined;
    }
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    if (typeof seedSSI === "string") {
        try {
            seedSSI = keySSISpace.parse(seedSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`);
        }
    }

    this.getDomain = () => {
        let domain;
        if (!isInitialisation) {
            domain = tokens[0];
        } else {
            domain = seedSSI.getDLDomain();
        }

        return domain;
    }

    const getRawPublicKey = () => {
        let publicKey;
        if (!isInitialisation) {
            publicKey = crypto.decodeBase58(tokens[1])
        } else {
            publicKey = seedSSI.getPublicKey("raw");
        }

        return publicKey;
    }

    this.getPublicKey = (format, callback) => {
        let pubKey = getRawPublicKey();
        try {
            pubKey = crypto.convertPublicKey(pubKey, format);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to convert public key to ${format}`, e));
        }

        callback(undefined, pubKey);
    };

    this.getIdentifier = () => {
        const domain = this.getDomain();
        let publicKey = getRawPublicKey();
        publicKey = crypto.encodeBase58(publicKey);
        return `did:ssi:key:${domain}:${publicKey}`;
    };

    this.getPrivateKeys = () => {
        return [seedSSI.getPrivateKey()];
    };

    return this;
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new KeyDID_Document(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new KeyDID_Document(false, [tokens[3], tokens[4]]);
    }
};

},{"../W3CDID_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/W3CDID_Mixin.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/NameDID_Document.js":[function(require,module,exports){
function NameDID_Document(domain, name) {
    if (typeof domain === "undefined" || typeof name === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

    let mixin = require("./ConstDID_Document_Mixin");
    mixin(this, domain, name);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    this.getIdentifier = () => {
        return `did:ssi:name:${domain}:${name}`;
    };

    this.getName = () => {
        return name;
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getName", "on", "off", "addPublicKey", "readMessage", "getDomain", "getHash"]);
    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (domain, name) {
        return new NameDID_Document(domain, name)
    },
    createDIDDocument: function (tokens) {
        return new NameDID_Document(tokens[3], tokens[4]);
    }
};

},{"../../utils/BindAutoPendingFunctions":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/BindAutoPendingFunctions.js","./ConstDID_Document_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ConstDID_Document_Mixin.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/SReadDID_Document.js":[function(require,module,exports){
function SReadDID_Document(isInitialisation, seedSSI) {
    let DID_mixin = require("./ConstDID_Document_Mixin");
    let tokens;
    let sReadSSI;

    const PUB_KEYS_PATH = "publicKeys";
    DID_mixin(this);

    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");

    const createSeedDSU = async () => {
        try {
            this.dsu = await $$.promisify(resolver.createDSUForExistingSSI)(seedSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to create seed dsu`, e);
        }

        let ssi;
        try {
            ssi = await $$.promisify(keySSISpace.createSeedSSI)(seedSSI.getDLDomain());
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to create seed ssi`, e);
        }

        this.privateKey = ssi.getPrivateKey();
        const publicKey = ssi.getPublicKey("raw");
        try {
            await $$.promisify(this.dsu.writeFile)(`${PUB_KEYS_PATH}/${publicKey.toString("hex")}`);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to write public key in dsu`, e);
        }
    };

    this.init = async () => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`, e);
            }
        }

        if (isInitialisation) {
            sReadSSI = seedSSI.derive();
            await createSeedDSU();
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        } else {
            tokens = seedSSI;
            sReadSSI = tokens.join(":");
            sReadSSI = keySSISpace.parse(sReadSSI);
            seedSSI = undefined;

            try {
                this.dsu = await $$.promisify(resolver.loadDSU)(sReadSSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to load dsu`, e);
            }

            this.finishInitialisation();
            this.dispatchEvent("initialised");
        }
    };

    this.getDomain = () => {
        let domain;
        if (!isInitialisation) {
            domain = sReadSSI.getDLDomain();
        } else {
            domain = seedSSI.getDLDomain();
        }

        return domain;
    }

    this.getIdentifier = () => {
        return `did:${sReadSSI.getIdentifier(true)}`
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getDomain", "on", "off", "addPublicKey"]);

    this.init();
    return this;
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new SReadDID_Document(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new SReadDID_Document(false, tokens.slice(1));
    }
};

},{"../../utils/BindAutoPendingFunctions":"/home/runner/work/privatesky/privatesky/modules/opendsu/utils/BindAutoPendingFunctions.js","./ConstDID_Document_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ConstDID_Document_Mixin.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ssiMethods.js":[function(require,module,exports){
function SReadDID_Method() {
    let SReadDID_Document = require("./SReadDID_Document");
    this.create = (seedSSI, callback) => {
        const sReadDIDDocument = SReadDID_Document.initiateDIDDocument(seedSSI);
        sReadDIDDocument.on("initialised", () => {
            const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();

            securityContext.registerDID(sReadDIDDocument, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`failed to register did ${sReadDIDDocument.getIdentifier()} in security context`, err));
                }

                callback(null, sReadDIDDocument);
            })
        });
    }
    this.resolve = function (tokens, callback) {
        const sReadDIDDocument = SReadDID_Document.createDIDDocument(tokens);
        sReadDIDDocument.on("initialised", () => {
            callback(null, sReadDIDDocument);
        });
    }
}

function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (seedSSI, callback) {
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(seedSSI);
        const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();

        securityContext.registerDID(keyDIDDocument, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`failed to register did ${keyDIDDocument.getIdentifier()} in security context`, err));
            }

            callback(null, keyDIDDocument);
        })
    }

    this.resolve = function (tokens, callback) {
        callback(null, KeyDIDDocument.createDIDDocument(tokens))
    }
}

function NameDID_Method() {
    const NameDIDDocument = require("./NameDID_Document");

    this.create = (domain, publicName, callback) => {
        const nameDIDDocument = NameDIDDocument.initiateDIDDocument(domain, publicName);
        nameDIDDocument.on("initialised", () => {
            const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();

            securityContext.registerDID(nameDIDDocument, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`failed to register did ${nameDIDDocument.getIdentifier()} in security context`, err));
                }

                callback(null, nameDIDDocument);
            })
        });
    }

    this.resolve = (tokens, callback) => {
        callback(null, NameDIDDocument.createDIDDocument(tokens))
    }
}

function GroupDID_Method() {
    const GroupDIDDocument = require("./GroupDID_Document");

    this.create = (domain, groupName, callback) => {
        callback(null, GroupDIDDocument.initiateDIDDocument(domain, groupName));
    }

    this.resolve = (tokens, callback) => {
        callback(null, GroupDIDDocument.createDIDDocument(tokens))
    }
}

function create_KeyDID_Method() {
    return new KeyDID_Method();
}

function create_SReadDID_Method() {
    return new SReadDID_Method();
}

function create_NameDID_Method() {
    return new NameDID_Method();
}

function create_GroupDID_Method() {
    return new GroupDID_Method();
}


module.exports = {
    create_KeyDID_Method,
    create_SReadDID_Method,
    create_NameDID_Method,
    create_GroupDID_Method
}

},{"./GroupDID_Document":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/GroupDID_Document.js","./KeyDID_Document":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/KeyDID_Document.js","./NameDID_Document":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/NameDID_Document.js","./SReadDID_Document":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/SReadDID_Document.js","opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/index.js":[function(require,module,exports){
/*
    OpenDSU W3C compatible  ID pluginisable resolver  that can resolve arbitrary DID methods.

        1. SeedSSI compatible DID method that does not need anchoring or external DSUs
            did:ssi:key:blockchain_domain::publicKey:v2:

        2.  DID method storing the public key in an anchored DSU. It is a SeedSSI compatible DID method.
            did:ssi:sread:blockchain_domain:hash_privateKey:hash_publicKey:

        3.  DID method storing the public key in an immutable DSU that is mounting another mutable DSU to store the keys
            did:ssi:name:blockchain_domain:public-name:::

        4. Group DID
            did:ssi:group:blockchain_domain:const_string

        5. DID Web Method
            did:web:internet_domain.

        6. SSI DID_KEY
            did:key:public_key

        7. DID DEMO
            did:demo:const_string
        TODO: analise the implementation of resolvers  masquerading as DSUs anchored in the BDNS central root:  did:ethereum:whatever

 */

const OPENDSU_METHOD_NAME = "ssi";
const KEY_SUBTYPE = "key";
const S_READ_SUBTYPE = "sread";
const NAME_SUBTYPE = "name";
const DEMO_METHOD_NAME = "demo";
const GROUP_METHOD_NAME = "group";

let methodRegistry = {};

/*
    Create a new W3CDID based on SeedSSI
 */
function createIdentity(didMethod, ...args) {
    let callback = args.pop();
    methodRegistry[didMethod].create(...args, callback);
}


/*
    Returns an error or an instance of W3CDID
 */
function resolveDID(identifier, callback) {
    let tokens = identifier.split(":");
    if (tokens[0] !== "did") {
        return callback(Error("Wrong identifier format. Missing did keyword."));
    }
    let method = tokens[1];
    if (tokens[1] === OPENDSU_METHOD_NAME) {
        method = tokens[2];
    }
    methodRegistry[method].resolve(tokens, callback);
}

function registerDIDMethod(method, implementation) {
    methodRegistry[method] = implementation;
}


registerDIDMethod(S_READ_SUBTYPE, require("./didssi/ssiMethods").create_SReadDID_Method());
registerDIDMethod(KEY_SUBTYPE, require("./didssi/ssiMethods").create_KeyDID_Method());
registerDIDMethod(NAME_SUBTYPE, require("./didssi/ssiMethods").create_NameDID_Method());

registerDIDMethod(DEMO_METHOD_NAME, require("./demo/diddemo").create_demo_DIDMethod());
registerDIDMethod(GROUP_METHOD_NAME, require("./didssi/ssiMethods").create_GroupDID_Method());


module.exports = {
    createIdentity,
    resolveDID,
    registerDIDMethod
}

},{"./demo/diddemo":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/demo/diddemo.js","./didssi/ssiMethods":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/didssi/ssiMethods.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/proposals/aliasDocument.js":[function(require,module,exports){


function AliasDIDDocument(isInitialisation, alias, seedSSI){
    let mixin =  require("../W3CDID_Mixin");
    let tokens;
    if(isInitialisation){
        tokens = alias;
        alias = undefined;
    }
    mixin(this);
    return this;
}

module.exports = {
    initiateDIDDocument:function(alias, seedSSI){
        new AliasDIDDocument(true, alias, seedSSI)
    },
    createDIDDocument:function(tokens){
        new AliasDIDDocument(false, tokens)
    }
};
},{"../W3CDID_Mixin":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/W3CDID_Mixin.js"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/bootScript/node.js":[function(require,module,exports){
module.exports = () => {
    const worker_threads = "worker_threads";
    const { parentPort } = require(worker_threads);

    parentPort.postMessage("ready");

    parentPort.on("message", ({ functionName, payload }) => {
        console.log(`[workers] node worker activated by function "${functionName}"`);

        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            parentPort.postMessage({ result });
        } catch (error) {
            parentPort.postMessage({ error });
        }
    });

    process.on("uncaughtException", (error) => {
        console.error("[workers] uncaughtException inside node worker", error);

        setTimeout(() => process.exit(1), 100);
    });
}
},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/bootScript/web.js":[function(require,module,exports){
module.exports = () => {
    addEventListener('message', (event) => {
        const { functionName, payload } = event.data;

        console.log(`[workers] web worker activated by function "${functionName}"`);

        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            postMessage({ result });
        } catch (error) {
            postMessage({ error });
        }
    });

    addEventListener('error', (event) => {
        const error = event.data;

        console.error("[workers] web worker error", error);
    });
}
},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/functions.js":[function(require,module,exports){
function runSyncFunction({ apiSpaceName, functionName, params }) {
    const openDSU = require("opendsu");
    const api = openDSU.loadAPI(apiSpaceName);

    if (!api[functionName]) {
        throw Error(`function "${functionName}" does not exists in "${apiSpaceName}"!`)
    }

    return api[functionName].apply(undefined, params);
}

function runSyncFunctionOnlyFromWorker({ apiSpaceName, functionName, params }) {
    return runSyncFunction({ apiSpaceName, functionName, params })
}

module.exports = {
    runSyncFunction,
    runSyncFunctionOnlyFromWorker
}
},{"opendsu":"opendsu"}],"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/index.js":[function(require,module,exports){
function getWebWorkerBootScript() {
    const scriptLocation = document.currentScript
        ? document.currentScript
        : new Error().stack.match(/([^ ^(\n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/gi)[0];
    return URL.createObjectURL(
        new Blob(
            [
                `
                (function () {
                    importScripts("${scriptLocation}");
                    (${require("./bootScript/web").toString()})();     
                })()
                `
            ],
            { type: "application/javascript" }
        )
    );
}

function getNodeWorkerBootScript() {
    const openDSUScriptPath = global.bundlePaths.openDSU.replace(/\\/g, "\\\\").replace(".js", "");
    return `
        require("${openDSUScriptPath}");
        (${require("./bootScript/node").toString()})();
    `;
}

function createPoolOfWebWorkers(options = {}) {
    if (!window.Worker) {
        return;
    }

    console.log("[workers] starting web worker...");

    const syndicate = require("syndicate");
    const blobURL = getWebWorkerBootScript();
    const workerPool = syndicate.createWorkerPool({
        bootScript: blobURL,
        workerStrategy: syndicate.WorkerStrategies.WEB_WORKERS,
        ...options
    });

    setTimeout(() => {
        // after usage, the blob must be removed in order to avoid memory leaks
        // it requires a timeout in order for syndicate to be able to get the blob script before it's removed
        URL.revokeObjectURL(blobURL);
    });

    return workerPool;
}

function createPoolOfNodeWorkers(options = {}) {
    const worker_threads = "worker_threads";
    const { isMainThread } = require(worker_threads);

    if (!isMainThread) {
        return;
    }

    console.log("[workers] starting node worker...");

    return require("syndicate").createWorkerPool({
        bootScript: getNodeWorkerBootScript(),
        workerOptions: { eval: true },
        ...options,
    });
}

function callbackForWorker(callback) {
    return (error, result) => {
        if (error) {
            return callback(error);
        }

        // this is quite a hack or workaround made for portability
        // in WebWorkers messages are transmitted through "Events" (event.data)
        // but in NodeWorkers messages are send as "Objects" (data)
        const {
            error: taskError,
            result: taskResult
        } = typeof Event !== "undefined" && result instanceof Event ? result.data : result;

        if (taskError) {
            return callback(taskError);
        }

        return callback(undefined, taskResult);
    }
}

function runTask(functionName, payload, callback) {
    // task is executed if there is a worker available
    const isExecuted = this.workerPool.runTaskImmediately({ functionName, payload }, callbackForWorker(callback));

    if (!isExecuted) {
        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            return callback(undefined, result);
        } catch (error) {
            return callback(error);
        }
    }
}

function addTask(functionName, payload, callback) {
    // task is queued if there is no worker available
    this.workerPool.addTask({ functionName, payload }, callbackForWorker(callback));
}


/**
 * Cross Environment wrapper over syndicate
 */
class CrossEnvironmentWorkerPool {
    constructor(options) {
        const { ENVIRONMENT_TYPES } = require("../moduleConstants.js");
        this.workerPool = undefined;
        this.environmentType = undefined;

        switch ($$.environmentType) {
            case ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                this.workerPool = createPoolOfWebWorkers(options);
                this.environmentType = ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE;
                break;
            case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
                this.workerPool = createPoolOfNodeWorkers(options);
                this.environmentType = ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE;
                break;
        }
    }

    runSyncFunction(apiSpaceName, functionName, ...params) {
        const currentFunctionName = "runSyncFunction";
        const callback = params.pop();
        const payload = { apiSpaceName, functionName, params };

        if (typeof callback !== 'function') {
            console.error(`[workers] function ${currentFunctionName} must receive a callback!`);
            return;
        }

        runTask.call(this, currentFunctionName, payload, callback);
    }

    runSyncFunctionOnlyByWorker(apiSpaceName, functionName, ...params) {
        const currentFunctionName = "runSyncFunctionOnlyFromWorker";
        const callback = params.pop();
        const payload = { apiSpaceName, functionName, params };

        if (typeof callback !== 'function') {
            console.error(`[workers] function ${currentFunctionName} must receive a callback!`);
            return;
        }

        addTask.call(this, "runSyncFunctionOnlyFromWorker", payload, callback);
    }

    get environment() {
        return this.environmentType;
    }
}

function createPool(options) {
    const pool = new CrossEnvironmentWorkerPool(options);
    return pool.environment ? pool : undefined;
}

function getFunctionsRegistry() {
    return require("./functions");
}

module.exports = {
    createPool,
    getFunctionsRegistry
}
},{"../moduleConstants.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./bootScript/node":"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/bootScript/node.js","./bootScript/web":"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/bootScript/web.js","./functions":"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/functions.js","opendsu":"opendsu","syndicate":false}],"/home/runner/work/privatesky/privatesky/modules/overwrite-require/moduleConstants.js":[function(require,module,exports){
module.exports = {
  BROWSER_ENVIRONMENT_TYPE: 'browser',
  MOBILE_BROWSER_ENVIRONMENT_TYPE: 'mobile-browser',
  WEB_WORKER_ENVIRONMENT_TYPE: 'web-worker',
  SERVICE_WORKER_ENVIRONMENT_TYPE: 'service-worker',
  ISOLATE_ENVIRONMENT_TYPE: 'isolate',
  THREAD_ENVIRONMENT_TYPE: 'thread',
  NODEJS_ENVIRONMENT_TYPE: 'nodejs'
};

},{}],"/home/runner/work/privatesky/privatesky/modules/overwrite-require/standardGlobalSymbols.js":[function(require,module,exports){
let logger = console;

if(typeof $$.Buffer === "undefined"){
    $$.Buffer = require("buffer").Buffer;
}

if (typeof global.$$.uidGenerator == "undefined") {
    $$.uidGenerator = {};
    $$.uidGenerator.safe_uuid = require("swarmutils").safe_uuid;
}

if (!global.process || process.env.NO_LOGS !== 'true') {
    try {
        const zmqName = "zeromq";
        require(zmqName);
        const PSKLoggerModule = require('psklogger');
        const PSKLogger = PSKLoggerModule.PSKLogger;

        logger = PSKLogger.getLogger();

        console.log('Logger init successful', process.pid);
    } catch (e) {
        if(e.message.indexOf("psklogger")!==-1 || e.message.indexOf("zeromq")!==-1){
            console.log('Logger not available, using console');
            logger = console;
        }else{
            console.log(e);
        }
    }
} else {
    console.log('Environment flag NO_LOGS is set, logging to console');
}

$$.registerGlobalSymbol = function (newSymbol, value) {
    if (typeof $$[newSymbol] == "undefined") {
        Object.defineProperty($$, newSymbol, {
            value: value,
            writable: false
        });
    } else {
        logger.error("Refusing to overwrite $$." + newSymbol);
    }
};

console.warn = (...args)=>{
    console.log(...args);
};

/**
 * @method
 * @name $$#autoThrow
 * @param {Error} err
 * @throws {Error}
 */

$$.registerGlobalSymbol("autoThrow", function (err) {
    if (!err) {
        throw err;
    }
});

/**
 * @method
 * @name $$#propagateError
 * @param {Error} err
 * @param {function} callback
 */
$$.registerGlobalSymbol("propagateError", function (err, callback) {
    if (err) {
        callback(err);
        throw err; //stop execution
    }
});

/**
 * @method
 * @name $$#logError
 * @param {Error} err
 */
$$.registerGlobalSymbol("logError", function (err) {
    if (err) {
        console.log(err);
        $$.err(err);
    }
});

/**
 * @method
 * @name $$#fixMe
 * @param {...*} args
 */

$$.registerGlobalSymbol("fixMe", function (...args) {
    console.log("Fix this:", ...args);
});

/**
 * @method - Throws an error
 * @name $$#exception
 * @param {string} message
 * @param {*} type
 */
$$.registerGlobalSymbol("exception", function (message, type) {
    throw new Error(message);
});

/**
 * @method - Throws an error
 * @name $$#throw
 * @param {string} message
 * @param {*} type
 */
$$.registerGlobalSymbol("throw", function (message, type) {
    throw new Error(message);
});


/**
 * @method - Warns that method is not implemented
 * @name $$#incomplete
 * @param {...*} args
 */
/* signal a  planned feature but not implemented yet (during development) but
also it could remain in production and should be flagged asap*/
$$.incomplete = function (...args) {
    args.unshift("Incomplete feature touched:");
    logger.warn(...args);
};

/**
 * @method - Warns that method is not implemented
 * @name $$#notImplemented
 * @param {...*} args
 */
$$.notImplemented = $$.incomplete;


/**
 * @method Throws if value is false
 * @name $$#assert
 * @param {boolean} value - Value to assert against
 * @param {string} explainWhy - Reason why assert failed (why value is false)
 */
/* used during development and when trying to discover elusive errors*/
$$.registerGlobalSymbol("assert", function (value, explainWhy) {
    if (!value) {
        throw new Error("Assert false " + explainWhy);
    }
});

/**
 * @method
 * @name $$#flags
 * @param {string} flagName
 * @param {*} value
 */
/* enable/disabale flags that control psk behaviour*/
$$.registerGlobalSymbol("flags", function (flagName, value) {
    $$.incomplete("flags handling not implemented");
});

/**
 * @method - Warns that a method is obsolete
 * @name $$#obsolete
 * @param {...*} args
 */
$$.registerGlobalSymbol("obsolete", function (...args) {
    args.unshift("Obsolete feature:");
    logger.log(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "log"
 * @name $$#log
 * @param {...*} args
 */
$$.registerGlobalSymbol("log", function (...args) {
    args.unshift("Log:");
    logger.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "info"
 * @name $$#info
 * @param {...*} args
 */
$$.registerGlobalSymbol("info", function (...args) {
    args.unshift("Info:");
    logger.log(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "error"
 * @name $$#err
 * @param {...*} args
 */
$$.registerGlobalSymbol("err", function (...args) {
    args.unshift("Error:");
    logger.error(...args);
    console.error(...args);
});

/**
 * @method - Uses the logger to log a message of level "error"
 * @name $$#err
 * @param {...*} args
 */
$$.registerGlobalSymbol("error", function (...args) {
    args.unshift("Error:");
    logger.error(...args);
    console.error(...args);
});

/**
 * @method - Uses the logger to log a message of level "warning"
 * @name $$#warn
 * @param {...*} args
 */
$$.registerGlobalSymbol("warn", function (...args) {
    args.unshift("Warn:");
    logger.warn(...args);
    console.log(...args);
});

/**
 * @method - Uses the logger to log a message of level "syntexError"
 * @name $$#syntexError
 * @param {...*} args
 */
$$.registerGlobalSymbol("syntaxError", function (...args) {
    args.unshift("Syntax error:");
    logger.error(...args);
    try{
        throw new Error("Syntax error or misspelled symbol!");
    }catch(err){
        console.error(...args);
        console.error(err.stack);
    }

});

/**
 * @method - Logs an invalid member name for a swarm
 * @name $$#invalidMemberName
 * @param {string} name
 * @param {Object} swarm
 */
$$.invalidMemberName = function (name, swarm) {
    let swarmName = "unknown";
    if (swarm && swarm.meta) {
        swarmName = swarm.meta.swarmTypeName;
    }
    const text = "Invalid member name " + name + "in swarm " + swarmName;
    console.error(text);
    logger.err(text);
};

/**
 * @method - Logs an invalid swarm name
 * @name $$#invalidSwarmName
 * @param {string} name
 * @param {Object} swarm
 */
$$.registerGlobalSymbol("invalidSwarmName", function (swarmName) {
    const text = "Invalid swarm name " + swarmName;
    console.error(text);
    logger.err(text);
});

/**
 * @method - Logs unknown exceptions
 * @name $$#unknownException
 * @param {...*} args
 */
$$.registerGlobalSymbol("unknownException", function (...args) {
    args.unshift("unknownException:");
    logger.err(...args);
    console.error(...args);
});

/**
 * @method - PrivateSky event, used by monitoring and statistics
 * @name $$#event
 * @param {string} event
 * @param {...*} args
 */
$$.registerGlobalSymbol("event", function (event, ...args) {
    if (logger.hasOwnProperty('event')) {
        logger.event(event, ...args);
    } else {
        if(event === "status.domains.boot"){
            console.log("Failing to console...", event, ...args);
        }
    }
});

/**
 * @method -
 * @name $$#redirectLog
 * @param {string} event
 * @param {...*} args
 */
$$.registerGlobalSymbol("redirectLog", function (logType, logObject) {
    if(logger.hasOwnProperty('redirect')) {
        logger.redirect(logType, logObject);
    }
});

/**
 * @method - log throttling event // it is just an event?
 * @name $$#throttlingEvent
 * @param {...*} args
 */
$$.registerGlobalSymbol("throttlingEvent", function (...args) {
    logger.log(...args);
});

},{"buffer":false,"psklogger":false,"swarmutils":"swarmutils"}],"/home/runner/work/privatesky/privatesky/modules/psk-cache/lib/Cache.js":[function(require,module,exports){
const DEFAULT_ITEMS_LIMIT = 1000;
const DEFAULT_STORAGE_LEVELS = 3;

/**
 * @param {object} options
 * @param {Number} options.maxLevels Number of storage levels. Defaults to 3
 * @param {Number} options.limit Number of max items the cache can store per level.
 *                               Defaults to 1000
 */
function Cache(options) {
    options = options || {};
    this.limit = parseInt(options.limit, 10) || DEFAULT_ITEMS_LIMIT;
    this.maxLevels = parseInt(options.maxLevels, 10) || DEFAULT_STORAGE_LEVELS;
    this.storage = null;

    if (this.limit < 0) {
        throw new Error('Limit must be a positive number');
    }
    if (this.maxLevels < 1) {
        throw new Error('Cache needs at least one storage level');
    }


    /**
     * Create an array of Map objects for storing items
     *
     * @param {Number} maxLevels
     * @return {Array.<Map>}
     */
    this.createStorage = function (maxLevels) {
        const storage = [];
        for (let i = 0; i < maxLevels; i++) {
            storage.push(new Map());
        }

        return storage;
    }

    this.storage = this.createStorage(this.maxLevels);

    /**
     * @param {*} key
     * @param {*} value
     */
    this.set = function (key, value) {
        if (this.cacheIsFull()) {
            this.makeRoom();
        }

        this.storage[0].set(key, value);
    }

    /**
     * @param {*} key
     * @return {Boolean}
     */
    this.has = function (key) {
        for (let i = 0; i < this.storage.length; i++) {
            if (this.storage[i].has(key)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param {*} key
     * @return {*}
     */
    this.get = function (key) {
        if (this.storage[0].has(key)) {
            return this.storage[0].get(key);
        }

        return this.getFromLowerLevels(key);
    }

    /**
     * Get an item from the lower levels.
     * If one is found added it to the first level as well
     *
     * @param {*} key
     * @return {*}
     */
    this.getFromLowerLevels = function (key) {
        for (let i = 1; i < this.storage.length; i++) {
            const storageLevel = this.storage[i];
            if (!storageLevel.has(key)) {
                continue;
            }
            const value = storageLevel.get(key);
            this.set(key, value);
            return value;
        }
    }

    /**
     * @return {Boolean}
     */
    this.cacheIsFull = function () {
        return this.storage[0].size >= this.limit;
    }

    /**
     * Move all the items down by one level
     * and clear the first one to make room for new items
     */
    this.makeRoom = function () {
        for (let i = this.storage.length - 1; i > 0; i--) {
            this.storage[i] = this.storage[i - 1];
        }
        this.storage[0] = new Map();
    }
}

module.exports = Cache;

},{}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto')
const config = require('../config')
const crypto = require('crypto');

// Prevent benign malleability
function computeKDFInput(ephemeralPublicKey, sharedSecret) {
    return $$.Buffer.concat([ephemeralPublicKey, sharedSecret],
        ephemeralPublicKey.length + sharedSecret.length)
}

function computeSymmetricEncAndMACKeys(kdfInput, options) {
    let kdfKey = mycrypto.KDF(kdfInput, options.symmetricCipherKeySize + options.macKeySize, options.hashFunctionName, options.hashSize)
    const symmetricEncryptionKey = kdfKey.slice(0, options.symmetricCipherKeySize);
    const macKey = kdfKey.slice(options.symmetricCipherKeySize)
    return {
        symmetricEncryptionKey,
        macKey
    };
}

function getDecodedECDHPublicKeyFromEncEnvelope(encEnvelope) {
    if (encEnvelope.to_ecdh === undefined) {
        throw new Error("Receiver ECDH public key property not found in input encrypted envelope")
    }
    return mycrypto.PublicKeyDeserializer.deserializeECDHPublicKey(encEnvelope.to_ecdh)
}

function checkEncryptedEnvelopeMandatoryProperties(encryptedEnvelope) {
    const mandatoryProperties = ["to_ecdh", "r", "ct", "iv", "tag"];
    mandatoryProperties.forEach((property) => {
        if (typeof encryptedEnvelope[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from input encrypted envelope");
        }
    })
}

function createEncryptedEnvelopeObject(receiverECDHPublicKey, ephemeralECDHPublicKey, ciphertext, iv, tag, options) {
    return {
        to_ecdh: mycrypto.PublicKeySerializer.serializeECDHPublicKey(receiverECDHPublicKey, options),
        r: mycrypto.PublicKeySerializer.serializeECDHPublicKey(ephemeralECDHPublicKey, options),
        ct: ciphertext.toString(options.encodingFormat),
        iv: iv.toString(options.encodingFormat),
        tag: tag.toString(options.encodingFormat)
    }
}

function checkKeyPairMandatoryProperties(keyPairObject) {
    const mandatoryProperties = ["publicKey", "privateKey"];
    mandatoryProperties.forEach((property) => {
        if (typeof keyPairObject[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from input key pair object");
        }
    })
}

function convertKeysToKeyObjects(keysArray, type) {
    let createKey;
    if (!type) {
        type = "public";
    }

    if (type === "private") {
        createKey = crypto.createPrivateKey;
    }

    if (type === "public") {
        createKey = crypto.createPublicKey;
    }

    if (typeof createKey !== "function") {
        throw Error(`The specified type is invalid.`);
    }

    if (!Array.isArray(keysArray)) {
        keysArray = [keysArray];
    }

    const keyObjectsArr = keysArray.map(key => {
        if (typeof key === "string") {
            return createKey(key)
        } else {
            return key;
        }
    });

    if (keyObjectsArr.length === 1) {
        return keyObjectsArr[0];
    }

    return keyObjectsArr;
}

module.exports = {
    computeKDFInput,
    computeSymmetricEncAndMACKeys,
    getDecodedECDHPublicKeyFromEncEnvelope,
    checkEncryptedEnvelopeMandatoryProperties,
    createEncryptedEnvelopeObject,
    checkKeyPairMandatoryProperties,
    convertKeysToKeyObjects
}

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js":[function(require,module,exports){
module.exports = {
    curveName: 'secp256k1',
    encodingFormat: 'base64',
    macAlgorithmName: 'sha256',
    macKeySize: 16,
    hashFunctionName: 'sha256',
    hashSize: 32,
    signAlgorithmName: 'sha256',
    symmetricCipherName: 'aes-128-cbc',
    symmetricCipherKeySize: 16,
    ivSize: 16,
    publicKeyFormat: 'pem',
    publicKeyType: 'spki'
};

},{}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/cipher.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto');
const config = require('../config')


function symmetricEncrypt(key, plaintext, iv, options) {
    if (key.length !== options.symmetricCipherKeySize) {
        throw new Error('Invalid length of input symmetric encryption key')
    }
    if (iv === undefined) {
        iv = null
    }
    let cipher = crypto.createCipheriv(options.symmetricCipherName, key, iv);
    const firstChunk = cipher.update(plaintext);
    const secondChunk = cipher.final();
    return $$.Buffer.concat([firstChunk, secondChunk]);
}

function symmetricDecrypt(key, ciphertext, iv, options) {
    if (key.length !== options.symmetricCipherKeySize) {
        throw new Error('Invalid length of input symmetric decryption key')
    }
    if (iv === undefined) {
        iv = null
    }
    let cipher = crypto.createDecipheriv(options.symmetricCipherName, key, iv);
    const firstChunk = cipher.update(ciphertext);
    const secondChunk = cipher.final();
    return $$.Buffer.concat([firstChunk, secondChunk]);
}

module.exports = {
    symmetricEncrypt,
    symmetricDecrypt
}

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/digitalsig.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto');
const config = require('../config');

function computeDigitalSignature(privateECSigningKey, buffer, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    let encodingFormat = options.encodingFormat;
    let signObject = crypto.createSign(config.signAlgorithmName)
    signObject.update(buffer)
    signObject.end();
    return signObject.sign(privateECSigningKey, encodingFormat)

}

function verifyDigitalSignature(publicECVerificationKey, signature, buffer, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    let verifyObject = crypto.createVerify(options.signAlgorithmName)
    verifyObject.update(buffer)
    verifyObject.end()
    return verifyObject.verify(publicECVerificationKey, signature)
}

module.exports = {
    computeDigitalSignature,
    verifyDigitalSignature
}

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/ecephka.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto');
const config = require('../config');

class ECEphemeralKeyAgreement {

    constructor(options) {
        options = options || {};
        const defaultOpts = config;
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        this.ecdh = crypto.createECDH(options.curveName);
    }

    generateEphemeralPublicKey = () => {
        return this.ecdh.generateKeys();
    }

    generateSharedSecretForPublicKey = (theirECDHPublicKey) => {
        try {
            this.ecdh.getPublicKey()
        } catch(error) {
            throw new Error('You cannot generate a shared secret for another public key without calling generateEphemeralPublicKey() first')
        }
        return this.ecdh.computeSecret(theirECDHPublicKey);
    }

    computeSharedSecretFromKeyPair = (myECDHPrivateKey, theirECDHPublicKey) => {
        this.ecdh.setPrivateKey(myECDHPrivateKey);
        return this.ecdh.computeSecret(theirECDHPublicKey);
    }
}

module.exports = ECEphemeralKeyAgreement

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js":[function(require,module,exports){
'use strict';

const cipher = require('./cipher')
const kdf = require('./kdf')
const kmac = require('./kmac')
const sig = require('./digitalsig')
const crypto = require('crypto')

module.exports = {
    timingSafeEqual: function(a, b){
        const hashA = crypto.createHash("sha256");
        const digestA = hashA.update(a).digest("hex");

        const hashB = crypto.createHash("sha256");
        const digestB = hashB.update(b).digest("hex");
        return digestA === digestB;
    },
    getRandomBytes: crypto.randomBytes,
    computeDigitalSignature: sig.computeDigitalSignature,
    verifyDigitalSignature: sig.verifyDigitalSignature,
    symmetricEncrypt: cipher.symmetricEncrypt,
    symmetricDecrypt: cipher.symmetricDecrypt,
    KMAC: kmac,
    ECEphemeralKeyAgreement: require('./ecephka'),
    KDF: kdf.KDF2,
    PublicKeySerializer: require('./pkserializer'),
    PublicKeyDeserializer: require('./pkdeserializer')
}

},{"./cipher":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/cipher.js","./digitalsig":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/digitalsig.js","./ecephka":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/ecephka.js","./kdf":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/kdf.js","./kmac":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/kmac.js","./pkdeserializer":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/pkdeserializer.js","./pkserializer":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/pkserializer.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/kdf.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto');
const config = require('../config')

// Implementation of KDF2 as defined in ISO/IEC 18033-2
function KDF2(x, outputByteSize, hashFunction = config.hashFunctionName, hashSize = config.hashSize) {
    if (outputByteSize < 0) {
        throw new Error("KDF output key byte size needs to be >= 0, not " + outputByteSize)
    } //silly optimization here
    else if (outputByteSize === 0) {
        return $$.Buffer.alloc(0)
    }
    let k = Math.ceil(outputByteSize / hashSize)
    k++;
    let derivedKeyBuffer = $$.Buffer.alloc(outputByteSize)
    let iBuffer = $$.Buffer.alloc(4)
    for (let i = 1; i < k; i++) {
        iBuffer.writeInt32BE(i)
        let roundInput = $$.Buffer.concat([x, iBuffer], x.length + iBuffer.length)
        let roundHash = crypto.createHash(hashFunction).update(roundInput).digest()
        roundHash.copy(derivedKeyBuffer, (i - 1) * hashSize)
    }
    return derivedKeyBuffer
}

module.exports = {
    KDF2
}

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/kmac.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto');
const config = require('../config');

function computeKMAC(key, data, options) {
    if (key.length !== options.macKeySize) {
        throw new Error('Invalid length of input MAC key')
    }
    return crypto.createHmac(options.hashFunctionName, key).update(data).digest();
}

function verifyKMAC(tag, key, data, options) {
    if (key.length !== options.macKeySize) {
        throw new Error('Invalid length of input MAC key')
    }
    const timingSafeEqual = require('./index').timingSafeEqual;
    const computedTag = computeKMAC(key, data, options)
    return timingSafeEqual(computedTag, tag)
}

module.exports = {
    computeKMAC,
    verifyKMAC
}

},{"../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","./index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/pkdeserializer.js":[function(require,module,exports){
'use strict';

const crypto = require('crypto')
const config = require('../config');

function PublicKeyDeserializer() {
    this.deserializeECDHPublicKey = (ecdhPublicKeySerialized, options) => {
        options = options || {};
        const defaultOpts = config;
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        let encodingFormat = options.encodingFormat;
        return $$.Buffer.from(ecdhPublicKeySerialized, encodingFormat)
    }

    this.deserializeECSigVerPublicKey = (ecSigVerPublicKeySerialized, options) => {
        options = options || {};
        const defaultOpts = config;
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        let encodingFormat = options.encodingFormat;
        // let publicKey = $$.Buffer.from(ecSigVerPublicKeySerialized, encodingFormat);
        const ecKeyGenerator = require("../../lib/ECKeyGenerator").createECKeyGenerator();
        const publicKey = ecKeyGenerator.convertPublicKey(ecSigVerPublicKeySerialized, {originalFormat: "der", outputFormat: "pem", encodingFormat});
        return publicKey;
    }

}

module.exports = new PublicKeyDeserializer()

},{"../../lib/ECKeyGenerator":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/ECKeyGenerator.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/pkserializer.js":[function(require,module,exports){
const config = require('../config');

function PublicKeySerializer() {
    this.serializeECDHPublicKey = (ecdhPublicKey, options) => {
        options = options || {};
        const defaultOpts =  config;
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        let encodingFormat = options.encodingFormat;
        return ecdhPublicKey.toString(encodingFormat);
    }

    this.serializeECSigVerPublicKey = (ecSigVerPublicKey, options) => {
        options = options || {};
        const defaultOpts = config;
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        let encodingFormat = options.encodingFormat;
        const ecKeyGenerator = require("../../lib/ECKeyGenerator").createECKeyGenerator();
        const derPublicKey = ecKeyGenerator.convertPublicKey(ecSigVerPublicKey, {originalFormat: "pem", outputFormat: "der", encodingFormat});
        return derPublicKey.toString(encodingFormat)
    }
}

module.exports = new PublicKeySerializer()

},{"../../lib/ECKeyGenerator":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/ECKeyGenerator.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/decrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto')
const common = require('../common')
const config = require('../config')

function checkWrappedMessageMandatoryProperties(wrappedMessage) {
    const mandatoryProperties = ["from_ecsig", "msg", "sig"];
    mandatoryProperties.forEach((property) => {
        if (typeof wrappedMessage[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from wrapped message");
        }
    })
}

module.exports.decrypt = function (receiverECDHPrivateKey, encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;
    if (typeof encEnvelope === "string") {
        try{
            encEnvelope = JSON.parse(encEnvelope);
        }   catch (e) {
            throw Error(`Could not parse encEnvelope ${encEnvelope}`);
        }
    }

    if (typeof encEnvelope !== "object") {
        throw Error(`encEnvelope should be an object. Received ${typeof encEnvelope}`);
    }

    common.checkEncryptedEnvelopeMandatoryProperties(encEnvelope);
    const ephemeralPublicKey = $$.Buffer.from(encEnvelope.r, options.encodingFormat)

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const sharedSecret = ephemeralKeyAgreement.computeSharedSecretFromKeyPair(receiverECDHPrivateKey, ephemeralPublicKey)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, sharedSecret)
    const { symmetricEncryptionKey, macKey } = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const ciphertext = $$.Buffer.from(encEnvelope.ct, options.encodingFormat)
    const tag = $$.Buffer.from(encEnvelope.tag, options.encodingFormat)
    const iv = $$.Buffer.from(encEnvelope.iv, options.encodingFormat)

    if (!mycrypto.KMAC.verifyKMAC(tag,
        macKey,
        $$.Buffer.concat([ciphertext, iv],
            ciphertext.length + iv.length), options)
    ) {
        throw new Error("Bad MAC")
    }

    let wrappedMessageObject = JSON.parse(mycrypto.symmetricDecrypt(symmetricEncryptionKey, ciphertext, iv, options).toString())
    checkWrappedMessageMandatoryProperties(wrappedMessageObject)
    const senderECSigVerPublicKey = mycrypto.PublicKeyDeserializer.deserializeECSigVerPublicKey(wrappedMessageObject.from_ecsig)

    if (!mycrypto.verifyDigitalSignature(senderECSigVerPublicKey,
        $$.Buffer.from(wrappedMessageObject.sig, options.encodingFormat),
        sharedSecret, options)) {
        throw new Error("Bad signature")
    }
    return {
        from_ecsig: senderECSigVerPublicKey,
        message: $$.Buffer.from(wrappedMessageObject.msg, options.encodingFormat)
    };
}

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/encrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto')
const common = require('../common');
const config = require('../config');

function senderMessageWrapAndSerialization(senderECSigVerPublicKey, message, signature, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    return JSON.stringify({
        from_ecsig: mycrypto.PublicKeySerializer.serializeECSigVerPublicKey(senderECSigVerPublicKey, options),
        msg: message.toString(options.encodingFormat),
        sig: signature.toString(options.encodingFormat)
    });
}

module.exports.encrypt = function (senderECSigningKeyPair, receiverECDHPublicKey, message, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof message === "object" && !$$.Buffer.isBuffer(message)) {
        message = JSON.stringify(message);
    }

    if (typeof message === "string") {
        message = $$.Buffer.from(message);
    }

    if (!$$.Buffer.isBuffer(message)) {
        throw new Error('Input message has to be of type Buffer');
    }

    common.checkKeyPairMandatoryProperties(senderECSigningKeyPair)

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const ephemeralPublicKey = ephemeralKeyAgreement.generateEphemeralPublicKey()
    const sharedSecret = ephemeralKeyAgreement.generateSharedSecretForPublicKey(receiverECDHPublicKey)

    const signature = mycrypto.computeDigitalSignature(senderECSigningKeyPair.privateKey, sharedSecret, options)
    const senderAuthMsgEnvelopeSerialized = senderMessageWrapAndSerialization(senderECSigningKeyPair.publicKey, message, signature, options)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, sharedSecret)
    const { symmetricEncryptionKey, macKey } = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const iv = mycrypto.getRandomBytes(options.ivSize)
    const ciphertext = mycrypto.symmetricEncrypt(symmetricEncryptionKey, senderAuthMsgEnvelopeSerialized, iv, options)
    const tag = mycrypto.KMAC.computeKMAC(macKey,
        $$.Buffer.concat([ciphertext, iv],
            ciphertext.length + iv.length), options
    )

    return common.createEncryptedEnvelopeObject(receiverECDHPublicKey, ephemeralPublicKey, ciphertext, iv, tag, options)
};

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/index.js":[function(require,module,exports){
'use strict';

module.exports = {
  encrypt: require('./encrypt').encrypt,
  decrypt: require('./decrypt').decrypt,
  getDecodedECDHPublicKeyFromEncEnvelope: require('../common').getDecodedECDHPublicKeyFromEncEnvelope
}
},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","./decrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/decrypt.js","./encrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/encrypt.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/decrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto');
const common = require('../common')
const config = require('../config')

function checkWrappedMessageMandatoryProperties(wrappedMessage) {
    const mandatoryProperties = ["from_ecdh", "msg"];
    mandatoryProperties.forEach((property) => {
        if (typeof wrappedMessage[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from wrapped message");
        }
    })
}

module.exports.decrypt = function (receiverECDHPrivateKey, encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof encEnvelope === "string") {
        try{
            encEnvelope = JSON.parse(encEnvelope);
        }   catch (e) {
            throw Error(`Could not parse encEnvelope ${encEnvelope}`);
        }
    }

    if (typeof encEnvelope !== "object") {
        throw Error(`encEnvelope should be an object. Received ${typeof encEnvelope}`);
    }

    common.checkEncryptedEnvelopeMandatoryProperties(encEnvelope)
    const ephemeralPublicKey = mycrypto.PublicKeyDeserializer.deserializeECDHPublicKey(encEnvelope.r, options)

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const sharedSecret = ephemeralKeyAgreement.computeSharedSecretFromKeyPair(receiverECDHPrivateKey, ephemeralPublicKey)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, sharedSecret)
    const { symmetricEncryptionKey, macKey } = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const ciphertext = $$.Buffer.from(encEnvelope.ct, options.encodingFormat)
    const tag = $$.Buffer.from(encEnvelope.tag, options.encodingFormat)
    const iv = $$.Buffer.from(encEnvelope.iv, options.encodingFormat)

    const wrappedMessageObject = JSON.parse(mycrypto.symmetricDecrypt(symmetricEncryptionKey, ciphertext, iv, options).toString())
    checkWrappedMessageMandatoryProperties(wrappedMessageObject)
    const senderPublicKey = mycrypto.PublicKeyDeserializer.deserializeECDHPublicKey(wrappedMessageObject.from_ecdh, options);

    const senderKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const senderDerivedSharedSecret = senderKeyAgreement.computeSharedSecretFromKeyPair(receiverECDHPrivateKey, senderPublicKey)
    // **TODO**: This does not seem correct, need to think about it.
    mycrypto.KMAC.verifyKMAC(tag, macKey,
        $$.Buffer.concat([ciphertext, iv, senderDerivedSharedSecret],
            ciphertext.length + iv.length + senderDerivedSharedSecret.length), options
    )

    return {
        from_ecdh: senderPublicKey,
        message: $$.Buffer.from(wrappedMessageObject.msg, options.encodingFormat)
    };
}

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/encrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto');
const common = require('../common')
const config = require('../config')

function senderMessageWrapAndSerialization(senderECDHPublicKey, message) {
    return JSON.stringify({
        from_ecdh: mycrypto.PublicKeySerializer.serializeECDHPublicKey(senderECDHPublicKey),
        msg: message
    });
}

module.exports.encrypt = function (senderECDHKeyPair, receiverECDHPublicKey, message, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof message === "object" && !$$.Buffer.isBuffer(message)) {
        message = JSON.stringify(message);
    }

    if (typeof message === "string") {
        message = $$.Buffer.from(message);
    }

    if (!$$.Buffer.isBuffer(message)) {
        throw new Error('Input message has to be of type Buffer');
    }
    common.checkKeyPairMandatoryProperties(senderECDHKeyPair)
    const senderKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const senderDerivedSharedSecret = senderKeyAgreement.computeSharedSecretFromKeyPair(senderECDHKeyPair.privateKey, receiverECDHPublicKey)

    const senderAuthMsgEnvelopeSerialized = senderMessageWrapAndSerialization(senderECDHKeyPair.publicKey, message);

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const ephemeralPublicKey = ephemeralKeyAgreement.generateEphemeralPublicKey()
    const ephemeralSharedSecret = ephemeralKeyAgreement.generateSharedSecretForPublicKey(receiverECDHPublicKey)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, ephemeralSharedSecret)
    const {symmetricEncryptionKey, macKey} = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const iv = mycrypto.getRandomBytes(options.ivSize)
    const ciphertext = mycrypto.symmetricEncrypt(symmetricEncryptionKey, senderAuthMsgEnvelopeSerialized, iv, options)
    // **TODO**: This does not seem correct, need to think about it.
    const tag = mycrypto.KMAC.computeKMAC(macKey,
        $$.Buffer.concat([ciphertext, iv, senderDerivedSharedSecret],
            ciphertext.length + iv.length + senderDerivedSharedSecret.length), options
    )

    return common.createEncryptedEnvelopeObject(receiverECDHPublicKey, ephemeralPublicKey, ciphertext, iv, tag, options)
};

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/index.js":[function(require,module,exports){
arguments[4]["/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/index.js"][0].apply(exports,arguments)
},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","./decrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/decrypt.js","./encrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/encrypt.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/decrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../../crypto')
const utils = require('../utils')
const common = require('../../common')
const config = require('../../config')

function checkEncryptedEnvelopeMandatoryProperties(encryptedEnvelope) {
    const mandatoryProperties = ["recvs", "rtag", "ct", "iv", "tag"];
    mandatoryProperties.forEach((property) => {
        if (typeof encryptedEnvelope[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from input group encrypted envelope");
        }
    })
}

module.exports.decrypt = function (receiverECDHKeyPair, encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    checkEncryptedEnvelopeMandatoryProperties(encEnvelope)
    common.checkKeyPairMandatoryProperties(receiverECDHKeyPair)
    const receiverECIESInstancesBuffer = $$.Buffer.from(encEnvelope.recvs, options.encodingFormat)

    const keyBuffer = utils.receiverMultiRecipientECIESDecrypt(receiverECDHKeyPair, receiverECIESInstancesBuffer)
    const {symmetricCipherKey, ciphertextMacKey, recvsMacKey} = utils.parseKeyBuffer(keyBuffer)

    const ciphertext = $$.Buffer.from(encEnvelope.ct, options.encodingFormat)
    const tag = $$.Buffer.from(encEnvelope.tag, options.encodingFormat)
    const iv = $$.Buffer.from(encEnvelope.iv, options.encodingFormat)
    const recvsTag = $$.Buffer.from(encEnvelope.rtag, options.encodingFormat)

    if (!mycrypto.KMAC.verifyKMAC(tag,
        ciphertextMacKey,
        $$.Buffer.concat([ciphertext, iv],
            ciphertext.length + iv.length), options)
    ) {
        throw new Error("Bad ciphertext MAC")
    }
    if (!mycrypto.KMAC.verifyKMAC(recvsTag,
        recvsMacKey,
        receiverECIESInstancesBuffer, options)
    ) {
        throw new Error("Bad recipient ECIES MAC")
    }

    return mycrypto.symmetricDecrypt(symmetricCipherKey, ciphertext, iv, options)
}

},{"../../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../utils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/encrypt.js":[function(require,module,exports){
'use strict';

const utils = require('../utils')
const mycrypto = require('../../crypto')
const config = require('../../config')

module.exports.encrypt = function (message, ...receiverECDHPublicKeys) {
    let options;
    const lastArg = receiverECDHPublicKeys[receiverECDHPublicKeys.length - 1];
    if (typeof lastArg === "object" && !Array.isArray(lastArg) && !$$.Buffer.isBuffer(lastArg) && !(lastArg instanceof Uint8Array)) {
        options = receiverECDHPublicKeys.pop();
    } else {
        options = {};
    }

    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof message === "object" && !$$.Buffer.isBuffer(message)) {
        message = JSON.stringify(message);
    }

    if (typeof message === "string") {
        message = $$.Buffer.from(message);
    }

    if (!$$.Buffer.isBuffer(message)) {
        throw new Error('Input message has to be of type Buffer');
    }

    if (receiverECDHPublicKeys.length === 0) {
        throw new Error('Need to specify at least one receiver public key')
    }

    receiverECDHPublicKeys.push(options);
    const { symmetricCipherKey, ciphertextMacKey, recvsMacKey } = utils.generateKeyBufferParams(options)
    const multiRecipientECIESBuffer = utils.senderMultiRecipientECIESEncrypt(
        $$.Buffer.concat([symmetricCipherKey, ciphertextMacKey, recvsMacKey],
            symmetricCipherKey.length + ciphertextMacKey.length + recvsMacKey.length),
        ...receiverECDHPublicKeys)

    const iv = mycrypto.getRandomBytes(options.ivSize)
    const ciphertext = mycrypto.symmetricEncrypt(symmetricCipherKey, message, iv, options)
    const tag = mycrypto.KMAC.computeKMAC(ciphertextMacKey,
        $$.Buffer.concat(
            [ciphertext, iv],
            ciphertext.length + iv.length), options
    );
    const recvsTag = mycrypto.KMAC.computeKMAC(recvsMacKey, multiRecipientECIESBuffer, options)

    return {
        recvs: multiRecipientECIESBuffer.toString(options.encodingFormat),
        rtag: recvsTag.toString(options.encodingFormat),
        ct: ciphertext.toString(options.encodingFormat),
        iv: iv.toString(options.encodingFormat),
        tag: tag.toString(options.encodingFormat)
    }
}

},{"../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../utils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/index.js":[function(require,module,exports){
'use strict';

module.exports = {
  encrypt: require('./encrypt').encrypt,
  decrypt: require('./decrypt').decrypt,
  getRecipientECDHPublicKeysFromEncEnvelope: require('../utils').getRecipientECDHPublicKeysFromEncEnvelope
}

},{"../utils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/index.js","./decrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/decrypt.js","./encrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/encrypt.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/decrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../../crypto')
const config = require('../../config')
const common = require('../../common')
const eciesGEAnon = require('../ecies-ge-anon')

function checkEncryptedEnvelopeMandatoryProperties(encryptedEnvelope) {
    const mandatoryProperties = ["from_ecsig", "sig"];
    mandatoryProperties.forEach((property) => {
        if (typeof encryptedEnvelope[property] === 'undefined') {
            throw new Error("Mandatory property " + property + " is missing from input encrypted envelope");
        }
    })
}

module.exports.decrypt = function (receiverECDHKeyPair, encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    checkEncryptedEnvelopeMandatoryProperties(encEnvelope)
    common.checkKeyPairMandatoryProperties(receiverECDHKeyPair)

    let tempGEAnonEnvelope = Object.assign({}, encEnvelope)
    delete tempGEAnonEnvelope.from_ecsig;
    delete tempGEAnonEnvelope.sig;
    const message = eciesGEAnon.decrypt(receiverECDHKeyPair, tempGEAnonEnvelope, options)
    tempGEAnonEnvelope = null;

    const senderECSigVerPublicKey = mycrypto.PublicKeyDeserializer.deserializeECSigVerPublicKey(encEnvelope.from_ecsig, options)

    const recvsTagBuffer = $$.Buffer.from(encEnvelope.rtag, options.encodingFormat)
    const tagBuffer = $$.Buffer.from(encEnvelope.tag, options.encodingFormat)
    const signature = $$.Buffer.from(encEnvelope.sig, options.encodingFormat)
    if (!mycrypto.verifyDigitalSignature(senderECSigVerPublicKey,
        signature,
        $$.Buffer.concat([recvsTagBuffer, tagBuffer],
            recvsTagBuffer.length + tagBuffer.length), options)
    ) {
        throw new Error("Bad signature")
    }

    return {
        from: senderECSigVerPublicKey,
        message: message
    }
}

},{"../../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../ecies-ge-anon":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/encrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../../crypto')
const common = require('../../common')
const config = require('../../config')
const eciesGEAnon = require('../ecies-ge-anon')

module.exports.encrypt = function (senderECSigningKeyPair, message, ...receiverECDHPublicKeys) {
    let options;
    const lastArg = receiverECDHPublicKeys[receiverECDHPublicKeys.length - 1];
    if (typeof lastArg === "object" && !Array.isArray(lastArg) && !$$.Buffer.isBuffer(lastArg) && !(lastArg instanceof Uint8Array)) {
        options = receiverECDHPublicKeys.pop();
    } else {
        options = {};
    }

    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof message === "object" && !$$.Buffer.isBuffer(message)) {
        message = JSON.stringify(message);
    }

    if (typeof message === "string") {
        message = $$.Buffer.from(message);
    }

    if (!$$.Buffer.isBuffer(message)) {
        throw new Error('Input message has to be of type Buffer');
    }

    common.checkKeyPairMandatoryProperties(senderECSigningKeyPair);
    receiverECDHPublicKeys.push(options);
    let eciesGEEnvelope = eciesGEAnon.encrypt(message, ...receiverECDHPublicKeys)

    const recvsTagBuffer = $$.Buffer.from(eciesGEEnvelope.rtag, options.encodingFormat)
    const tagBuffer = $$.Buffer.from(eciesGEEnvelope.tag, options.encodingFormat)
    const signature = mycrypto.computeDigitalSignature(senderECSigningKeyPair.privateKey,
        $$.Buffer.concat([recvsTagBuffer, tagBuffer],
            recvsTagBuffer.length + tagBuffer.length), options)

    eciesGEEnvelope.sig = signature.toString(options.encodingFormat)
    eciesGEEnvelope.from_ecsig = mycrypto.PublicKeySerializer.serializeECSigVerPublicKey(senderECSigningKeyPair.publicKey, options)

    return eciesGEEnvelope;
}

},{"../../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../ecies-ge-anon":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/index.js":[function(require,module,exports){
arguments[4]["/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/index.js"][0].apply(exports,arguments)
},{"../utils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/index.js","./decrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/decrypt.js","./encrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/encrypt.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/index.js":[function(require,module,exports){
'use strict';

const sender = require('./sender')
const recipient = require('./recipient')

module.exports = {
    generateKeyBufferParams: sender.generateKeyBufferParams,
    senderMultiRecipientECIESEncrypt: sender.senderMultiRecipientECIESEncrypt,
    getRecipientECDHPublicKeysFromEncEnvelope: recipient.getRecipientECDHPublicKeysFromEncEnvelope,
    receiverMultiRecipientECIESDecrypt: recipient.receiverMultiRecipientECIESDecrypt,
    parseKeyBuffer: recipient.parseKeyBuffer
}



},{"./recipient":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/recipient.js","./sender":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/sender.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/recipient.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../../crypto')
const common = require('../../common')
const ecies = require('../../ecies')
const config = require('../../config')

module.exports.getRecipientECDHPublicKeysFromEncEnvelope = function (encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (encEnvelope.recvs === undefined) {
        throw new Error('Mandatory property recvs not found in encrypted envelope')
    }
    let multiRecipientECIESEnvelopeArray = JSON.parse($$.Buffer.from(encEnvelope.recvs, options.encodingFormat))
    if (multiRecipientECIESEnvelopeArray.length === 0) {
        throw new Error('Invalid receiver array in encrypted envelope')
    }
    let recipientECDHPublicKeyArray = [];
    multiRecipientECIESEnvelopeArray.forEach(function (curRecipientECIESEnvelope) {
        common.checkEncryptedEnvelopeMandatoryProperties(curRecipientECIESEnvelope)
        let curRecipientECDHPublicKey = common.getDecodedECDHPublicKeyFromEncEnvelope(curRecipientECIESEnvelope, options)
        recipientECDHPublicKeyArray.push(curRecipientECDHPublicKey)
    })
    if (recipientECDHPublicKeyArray.length === 0) {
        throw new Error('Unable to parse any of the receivers\' ECIES instances')
    }
    return recipientECDHPublicKeyArray;
}

function isECIESEnvelopeForInputECDHPublicKey(eciesEnvelope, ecdhPublicKey, options) {
    const ecdhPublicKeyBuffer = $$.Buffer.from(mycrypto.PublicKeySerializer.serializeECDHPublicKey(ecdhPublicKey, options))
    const envelopeECDHPublicKey = $$.Buffer.from(eciesEnvelope.to_ecdh)
    return mycrypto.timingSafeEqual(envelopeECDHPublicKey, ecdhPublicKeyBuffer);
}

module.exports.receiverMultiRecipientECIESDecrypt = function(receiverECDHKeyPair, multiRecipientECIESBuffer, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    let multiRecipientECIESEnvelopeArray = JSON.parse(multiRecipientECIESBuffer)
    if (multiRecipientECIESEnvelopeArray.length === 0) {
        throw new Error("Parsed an empty receivers ECIES instances array")
    }
    let myECIESInstanceFound = false;
    let message;
    multiRecipientECIESEnvelopeArray.forEach(function (curRecipientECIESEnvelope) {
        common.checkEncryptedEnvelopeMandatoryProperties(curRecipientECIESEnvelope)
        if (isECIESEnvelopeForInputECDHPublicKey(curRecipientECIESEnvelope, receiverECDHKeyPair.publicKey, options)) {
            message = ecies.decrypt(receiverECDHKeyPair.privateKey, curRecipientECIESEnvelope, options)
            myECIESInstanceFound = true;
            return;
        }
    })
    if (!myECIESInstanceFound) {
        throw new Error("Unable to decrypt input envelope with input EC key pair")
    }
    return message;
}

module.exports.parseKeyBuffer = function (keyBuffer, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);

    options = defaultOpts;
    if (keyBuffer.length !== (options.symmetricCipherKeySize + (2*options.macKeySize))) {
        throw new Error("Invalid length of decrypted key buffer")
    }
    const symmetricCipherKey = keyBuffer.slice(0, options.symmetricCipherKeySize)
    const ciphertextMacKey = keyBuffer.slice(options.symmetricCipherKeySize, options.symmetricCipherKeySize + options.macKeySize)
    const recvsMacKey = keyBuffer.slice(options.symmetricCipherKeySize + options.macKeySize)
    return {
        symmetricCipherKey,
        ciphertextMacKey,
        recvsMacKey
    }
}

},{"../../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../../ecies":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/utils/sender.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../../crypto')
const ecies = require('../../ecies')
const config = require('../../config')

module.exports.generateKeyBufferParams = function (options) {
    const symmetricCipherKey = mycrypto.getRandomBytes(options.symmetricCipherKeySize)
    const ciphertextMacKey = mycrypto.getRandomBytes(options.macKeySize)
    const recvsMacKey = mycrypto.getRandomBytes(options.macKeySize)
    return {
        symmetricCipherKey,
        ciphertextMacKey,
        recvsMacKey
    }
}

module.exports.senderMultiRecipientECIESEncrypt = function(message, ...receiverECDHPublicKeyArray) {
    let options;
    const lastArg = receiverECDHPublicKeyArray[receiverECDHPublicKeyArray.length - 1];
    if (typeof lastArg === "object" && !Array.isArray(lastArg) && !$$.Buffer.isBuffer(lastArg) && !(lastArg instanceof Uint8Array)) {
        options = receiverECDHPublicKeyArray.pop();
    } else {
        options = {};
    }

    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    let eciesInstancesArray = []
    receiverECDHPublicKeyArray.forEach(function (curReceiverECDHPublicKey) {
        eciesInstancesArray.push(ecies.encrypt(curReceiverECDHPublicKey, message, options))
    })
    return $$.Buffer.from(JSON.stringify(eciesInstancesArray))
}

},{"../../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js","../../ecies":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/decrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto')
const common = require('../common')
const config = require('../config')


module.exports.decrypt = function (receiverECDHPrivateKey, encEnvelope, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof encEnvelope === "string") {
        try{
            encEnvelope = JSON.parse(encEnvelope);
        }   catch (e) {
            throw Error(`Could not parse encEnvelope ${encEnvelope}`);
        }
    }

    if (typeof encEnvelope !== "object") {
        throw Error(`encEnvelope should be an object. Received ${typeof encEnvelope}`);
    }

    common.checkEncryptedEnvelopeMandatoryProperties(encEnvelope)

    const ephemeralPublicKey = mycrypto.PublicKeyDeserializer.deserializeECDHPublicKey(encEnvelope.r, options)

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const sharedSecret = ephemeralKeyAgreement.computeSharedSecretFromKeyPair(receiverECDHPrivateKey, ephemeralPublicKey)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, sharedSecret)
    const { symmetricEncryptionKey, macKey } = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const ciphertext = $$.Buffer.from(encEnvelope.ct, options.encodingFormat)
    const tag = $$.Buffer.from(encEnvelope.tag, options.encodingFormat)
    const iv = $$.Buffer.from(encEnvelope.iv, options.encodingFormat)

    if (!mycrypto.KMAC.verifyKMAC(tag,
        macKey,
        $$.Buffer.concat([ciphertext, iv],
            ciphertext.length + iv.length), options)
    ) {
        throw new Error("Bad MAC")
    }

    return mycrypto.symmetricDecrypt(symmetricEncryptionKey, ciphertext, iv, options)
}

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/encrypt.js":[function(require,module,exports){
'use strict';

const mycrypto = require('../crypto')
const common = require('../common')
const config = require('../config');

module.exports.encrypt = function (receiverECDHPublicKey, message, options) {
    options = options || {};
    const defaultOpts = config;
    Object.assign(defaultOpts, options);
    options = defaultOpts;

    if (typeof message === "object" && !$$.Buffer.isBuffer(message)) {
        message = JSON.stringify(message);
    }

    if (typeof message === "string") {
        message = $$.Buffer.from(message);
    }

    if (!$$.Buffer.isBuffer(message)) {
        throw new Error('Input message has to be of type Buffer');
    }

    const ephemeralKeyAgreement = new mycrypto.ECEphemeralKeyAgreement(options)
    const ephemeralPublicKey = ephemeralKeyAgreement.generateEphemeralPublicKey()
    const sharedSecret = ephemeralKeyAgreement.generateSharedSecretForPublicKey(receiverECDHPublicKey)

    const kdfInput = common.computeKDFInput(ephemeralPublicKey, sharedSecret)
    const { symmetricEncryptionKey, macKey } = common.computeSymmetricEncAndMACKeys(kdfInput, options)

    const iv = mycrypto.getRandomBytes(options.ivSize)
    const ciphertext = mycrypto.symmetricEncrypt(symmetricEncryptionKey, message, iv, options)
    const tag = mycrypto.KMAC.computeKMAC(macKey,
        $$.Buffer.concat([ciphertext, iv],
            ciphertext.length + iv.length), options
    )

    return common.createEncryptedEnvelopeObject(receiverECDHPublicKey, ephemeralPublicKey, ciphertext, iv, tag, options)
}

},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","../config":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/config.js","../crypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/crypto/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/index.js":[function(require,module,exports){
arguments[4]["/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/index.js"][0].apply(exports,arguments)
},{"../common":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/common/index.js","./decrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/decrypt.js","./encrypt":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/encrypt.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/index.js":[function(require,module,exports){
module.exports = {
    ecies_encrypt: require("./ecies").encrypt,
    ecies_decrypt: require("./ecies").decrypt,
    ecies_encrypt_ds: require("./ecies-doa-ds").encrypt,
    ecies_decrypt_ds: require("./ecies-doa-ds").decrypt,
    ecies_encrypt_kmac: require("./ecies-doa-kmac").encrypt,
    ecies_decrypt_kmac: require("./ecies-doa-kmac").decrypt,
    ecies_getDecodedECDHPublicKeyFromEncEnvelope: require("./ecies/index").getDecodedECDHPublicKeyFromEncEnvelope,
    ecies_group_encrypt: require("./ecies-group-encryption/ecies-ge-anon").encrypt,
    ecies_group_decrypt: require("./ecies-group-encryption/ecies-ge-anon").decrypt,
    ecies_group_encrypt_ds: require("./ecies-group-encryption/ecies-ge-doa").encrypt,
    ecies_group_decrypt_ds: require("./ecies-group-encryption/ecies-ge-doa").decrypt,
    ecies_group_getRecipientECDHPublicKeysFromEncEnvelope: require("./ecies-group-encryption/ecies-ge-doa").getRecipientECDHPublicKeysFromEncEnvelope
}

},{"./ecies":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/index.js","./ecies-doa-ds":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-ds/index.js","./ecies-doa-kmac":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-doa-kmac/index.js","./ecies-group-encryption/ecies-ge-anon":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-anon/index.js","./ecies-group-encryption/ecies-ge-doa":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies-group-encryption/ecies-ge-doa/index.js","./ecies/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/ecies/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/ECKeyGenerator.js":[function(require,module,exports){
function ECKeyGenerator() {
    const crypto = require('crypto');
    const KeyEncoder = require('./keyEncoder');

    this.generateKeyPair = (namedCurve, callback) => {
        if (typeof namedCurve === "undefined") {
            callback = undefined;
            namedCurve = 'secp256k1';
        } else {
            if (typeof namedCurve === "function") {
                callback = namedCurve;
                namedCurve = 'secp256k1';
            }
        }

        const ec = crypto.createECDH(namedCurve);
        const publicKey = ec.generateKeys();
        const privateKey = ec.getPrivateKey();
        if(callback) {
            callback(undefined, publicKey, privateKey);
        }
        return {publicKey, privateKey};
    };

    this.getPemKeys = (privateKey, publicKey, options) => {
        const defaultOpts = {format: 'pem', namedCurve: 'secp256k1'};
        Object.assign(defaultOpts, options);
        options = defaultOpts;

        const result = {};
        const ECPrivateKeyASN = KeyEncoder.ECPrivateKeyASN;
        const SubjectPublicKeyInfoASN = KeyEncoder.SubjectPublicKeyInfoASN;
        const keyEncoder = new KeyEncoder(options.namedCurve);

        const privateKeyObject = keyEncoder.privateKeyObject(privateKey, publicKey);
        const publicKeyObject = keyEncoder.publicKeyObject(publicKey)

        result.privateKey = ECPrivateKeyASN.encode(privateKeyObject, options.format, privateKeyObject.pemOptions);
        result.publicKey = SubjectPublicKeyInfoASN.encode(publicKeyObject, options.format, publicKeyObject.pemOptions);

        return result;
    }

    this.getPublicKey = (privateKey, namedCurve) => {
        namedCurve = namedCurve || 'secp256k1';
        const ecdh = crypto.createECDH(namedCurve);
        ecdh.setPrivateKey(privateKey);
        return ecdh.getPublicKey();
    };

    this.convertPublicKey = (publicKey, options) => {
        options = options || {};
        options = removeUndefinedPropsInOpt(options)
        const defaultOpts = {originalFormat: 'raw', outputFormat: 'pem', encodingFormat:"hex", namedCurve: 'secp256k1'};
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        const keyEncoder = new KeyEncoder(options.namedCurve);
        return keyEncoder.encodePublic(publicKey, options.originalFormat, options.outputFormat, options.encodingFormat)
    };

    this.convertPrivateKey = (rawPrivateKey, options) => {
        options = options || {};
        options = removeUndefinedPropsInOpt(options)
        const defaultOpts = {originalFormat: 'raw', outputFormat: 'pem', namedCurve: 'secp256k1'};
        Object.assign(defaultOpts, options);
        options = defaultOpts;
        const keyEncoder = new KeyEncoder(options.namedCurve);
        return keyEncoder.encodePrivate(rawPrivateKey, options.originalFormat, options.outputFormat)
    };

    const removeUndefinedPropsInOpt = (options) => {
        if (options) {
            for (let prop in options) {
                if (typeof options[prop] === "undefined") {
                    delete options[prop];
                }
            }
        }

        return options;
    };
}

exports.createECKeyGenerator = () => {
    return new ECKeyGenerator();
};

},{"./keyEncoder":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/keyEncoder.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/PskCrypto.js":[function(require,module,exports){
function PskCrypto() {
    const crypto = require('crypto');
    const utils = require("./utils/cryptoUtils");
    const derAsn1Decoder = require("./utils/DerASN1Decoder");
    const PskEncryption = require("./PskEncryption");


    this.createPskEncryption = (algorithm) => {
        return new PskEncryption(algorithm);
    };

    this.generateKeyPair = (options, callback) => {
        return this.createKeyPairGenerator().generateKeyPair(options, callback);
    };

    this.createKeyPairGenerator = require("./ECKeyGenerator").createECKeyGenerator;

    this.sign = (algorithm, data, privateKey) => {
        if (typeof data === "string") {
            data = $$.Buffer.from(data);
        }

        const sign = crypto.createSign(algorithm);
        sign.update(data);
        sign.end();
        return sign.sign(privateKey);
    };

    this.verify = (algorithm, data, publicKey, signature) => {
        if (typeof data === "string") {
            data = $$.Buffer.from(data);
        }
        const verify = crypto.createVerify(algorithm);
        verify.update(data);
        verify.end();
        return verify.verify(publicKey, signature);
    };

    this.verifyDefault = (data, publicKey, signature) => {
        return this.verify('sha256', data, publicKey, signature);
    }

    this.privateEncrypt = (privateKey, data) => {
        if (typeof data === "string") {
            data = $$.Buffer.from(data);
        }

        return crypto.privateEncrypt(privateKey, data);
    };

    this.privateDecrypt = (privateKey, encryptedData) => {
        if (typeof encryptedData === "string") {
            encryptedData = $$.Buffer.from(encryptedData);
        }

        return crypto.privateDecrypt(privateKey, encryptedData);
    };

    this.publicEncrypt = (publicKey, data) => {
        if (typeof data === "string") {
            data = $$.Buffer.from(data);
        }

        return crypto.publicEncrypt(publicKey, data);
    };

    this.publicDecrypt = (publicKey, encryptedData) => {
        if (typeof encryptedData === "string") {
            encryptedData = $$.Buffer.from(encryptedData);
        }

        return crypto.publicDecrypt(publicKey, encryptedData);
    };

    this.pskHash = function (data, encoding) {
        if ($$.Buffer.isBuffer(data)) {
            return utils.createPskHash(data, encoding);
        }
        if (data instanceof Object) {
            return utils.createPskHash(JSON.stringify(data), encoding);
        }
        return utils.createPskHash(data, encoding);
    };

    this.hash = (algorithm, data, encoding) => {
        if (typeof data === "object" && !$$.Buffer.isBuffer(data)) {
            data = JSON.stringify(data);
        }
        const hash = crypto.createHash(algorithm);
        hash.update(data);
        return hash.digest(encoding);
    };

    this.objectHash = (algorithm, data, encoding) => {
        if(!$$.Buffer.isBuffer(data)){
            const ssutils = require("../signsensusDS/ssutil");
            data = ssutils.dumpObjectForHashing(data);
        }
        return this.hash(algorithm, data, encoding);
    };

    this.pskBase58Encode = function (data) {
        return utils.base58Encode(data);
    }

    this.pskBase58Decode = function (data) {
        return utils.base58Decode(data);
    }

    this.pskHashStream = function (readStream, callback) {
        const pskHash = new utils.PskHash();

        readStream.on('data', (chunk) => {
            pskHash.update(chunk);
        });


        readStream.on('end', () => {
            callback(null, pskHash.digest());
        })
    };

    this.generateSafeUid = function (password, additionalData) {
        password = password || $$.Buffer.alloc(0);
        if (!additionalData) {
            additionalData = $$.Buffer.alloc(0);
        }

        if (!$$.Buffer.isBuffer(additionalData)) {
            additionalData = $$.Buffer.from(additionalData);
        }

        return utils.encode(this.pskHash($$.Buffer.concat([password, additionalData])));
    };

    this.deriveKey = function deriveKey(algorithm, password, iterations) {
        if (arguments.length === 2) {
            if (typeof password === "number") {
                iterations = password
                password = algorithm;
                algorithm = "aes-256-gcm";
            } else {
                iterations = 1000;
            }
        }
        if (typeof password === "undefined") {
            iterations = 1000;
            password = algorithm;
            algorithm = "aes-256-gcm";
        }

        const keylen = utils.getKeyLength(algorithm);
        const salt = utils.generateSalt(password, 32);
        return crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
    };


    this.randomBytes = (len) => {
        if ($$.environmentType === "browser" /*or.constants.BROWSER_ENVIRONMENT_TYPE*/) {
            let randomArray = new Uint8Array(len);

            return window.crypto.getRandomValues(randomArray);
        } else {
            return crypto.randomBytes(len);
        }
    };

    this.xorBuffers = (...args) => {
        if (args.length < 2) {
            throw Error(`The function should receive at least two arguments. Received ${args.length}`);
        }

        if (args.length === 2) {
            __xorTwoBuffers(args[0], args[1]);
            return args[1];
        }

        for (let i = 0; i < args.length - 1; i++) {
            __xorTwoBuffers(args[i], args[i + 1]);
        }

        function __xorTwoBuffers(a, b) {
            if (!$$.Buffer.isBuffer(a) || !$$.Buffer.isBuffer(b)) {
                throw Error("The argument type should be $$.Buffer.");
            }

            const length = Math.min(a.length, b.length);
            for (let i = 0; i < length; i++) {
                b[i] ^= a[i];
            }

            return b;
        }

        return args[args.length - 1];
    };
    this.decodeDerToASN1ETH = (derSignatureBuffer) => derAsn1Decoder.decodeDERIntoASN1ETH(derSignatureBuffer);
    this.PskHash = utils.PskHash;

    const ecies = require("../js-mutual-auth-ecies/index");
    this.ecies_encrypt = ecies.ecies_encrypt;
    this.ecies_decrypt = ecies.ecies_decrypt;
    this.ecies_encrypt_kmac = ecies.ecies_encrypt_kmac;
    this.ecies_decrypt_kmac = ecies.ecies_decrypt_kmac;
    this.ecies_encrypt_ds = ecies.ecies_encrypt_ds;
    this.ecies_decrypt_ds = ecies.ecies_decrypt_ds;
}

module.exports = new PskCrypto();



},{"../js-mutual-auth-ecies/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/js-mutual-auth-ecies/index.js","../signsensusDS/ssutil":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/signsensusDS/ssutil.js","./ECKeyGenerator":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/ECKeyGenerator.js","./PskEncryption":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/PskEncryption.js","./utils/DerASN1Decoder":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/DerASN1Decoder.js","./utils/cryptoUtils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/PskEncryption.js":[function(require,module,exports){
function PskEncryption(algorithm) {
    const crypto = require("crypto");
    const utils = require("./utils/cryptoUtils");

    if (!algorithm) {
        throw Error("No encryption algorithm was provided");
    }

    let iv;
    let aad;
    let tag;
    let data;
    let key;

    let keylen = utils.getKeyLength(algorithm);
    let encryptionIsAuthenticated = utils.encryptionIsAuthenticated(algorithm);

    this.encrypt = (plainData, encryptionKey, options) => {
        if (typeof plainData === "string") {
            plainData = $$.Buffer.from(plainData);
        }

        if (typeof encryptionKey === "string") {
            encryptionKey = $$.Buffer.from(encryptionKey);
        }
        iv = iv || crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv, options);
        if (encryptionIsAuthenticated) {
            aad = crypto.randomBytes(encryptionKey.length);
            cipher.setAAD(aad);
        }

        let encData = $$.Buffer.concat([cipher.update(plainData), cipher.final()]);
        if (encryptionIsAuthenticated) {
            tag = cipher.getAuthTag();
        }

        if (iv) {
            encData = $$.Buffer.concat([encData, iv]);
        }

        if (aad) {
            encData = $$.Buffer.concat([encData, aad]);
        }

        if (tag) {
            encData = $$.Buffer.concat([encData, tag]);
        }

        key = encryptionKey;
        return encData;
    };

    this.decrypt = (encryptedData, decryptionKey, authTagLength = 0, options) => {
        if (typeof encryptedData === "string") {
            encryptedData = $$.Buffer.from(encryptedData);
        }
        if (typeof decryptionKey === "string") {
            decryptionKey = $$.Buffer.from(decryptionKey);
        }
        if (!iv) {
            this.getDecryptionParameters(encryptedData, authTagLength);
        }
        const decipher = crypto.createDecipheriv(algorithm, decryptionKey, iv, options);
        if (encryptionIsAuthenticated) {
            decipher.setAAD(aad);
            decipher.setAuthTag(tag);
        }

        return $$.Buffer.concat([decipher.update(data), decipher.final()]);
    };

    this.getDecryptionParameters = (encryptedData, authTagLength = 0) => {
        let aadLen = 0;
        if (encryptionIsAuthenticated) {
            authTagLength = 16;
            aadLen = keylen;
        }

        const tagOffset = encryptedData.length - authTagLength;
        tag = encryptedData.slice(tagOffset, encryptedData.length);

        const aadOffset = tagOffset - aadLen;
        aad = encryptedData.slice(aadOffset, tagOffset);

        iv = encryptedData.slice(aadOffset - 16, aadOffset);
        data = encryptedData.slice(0, aadOffset - 16);

        return {iv, aad, tag, data};
    };

    this.generateEncryptionKey = () => {
        keylen = utils.getKeyLength(algorithm);
        return crypto.randomBytes(keylen);
    };
}

module.exports = PskEncryption;

},{"./utils/cryptoUtils":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/api.js":[function(require,module,exports){
var asn1 = require('./asn1');
var inherits = require('util').inherits;

var api = exports;

api.define = function define(name, body) {
  return new Entity(name, body);
};

function Entity(name, body) {
  this.name = name;
  this.body = body;

  this.decoders = {};
  this.encoders = {};
};

Entity.prototype._createNamed = function createNamed(base) {
  var named;
  try {
    named = require('vm').runInThisContext(
      '(function ' + this.name + '(entity) {\n' +
      '  this._initNamed(entity);\n' +
      '})'
    );
  } catch (e) {
    named = function (entity) {
      this._initNamed(entity);
    };
  }
  inherits(named, base);
  named.prototype._initNamed = function initnamed(entity) {
    base.call(this, entity);
  };

  return new named(this);
};

Entity.prototype._getDecoder = function _getDecoder(enc) {
  // Lazily create decoder
  if (!this.decoders.hasOwnProperty(enc))
    this.decoders[enc] = this._createNamed(asn1.decoders[enc]);
  return this.decoders[enc];
};

Entity.prototype.decode = function decode(data, enc, options) {
  return this._getDecoder(enc).decode(data, options);
};

Entity.prototype._getEncoder = function _getEncoder(enc) {
  // Lazily create encoder
  if (!this.encoders.hasOwnProperty(enc))
    this.encoders[enc] = this._createNamed(asn1.encoders[enc]);
  return this.encoders[enc];
};

Entity.prototype.encode = function encode(data, enc, /* internal */ reporter) {
  return this._getEncoder(enc).encode(data, reporter);
};

},{"./asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","util":false,"vm":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js":[function(require,module,exports){
var asn1 = exports;

asn1.bignum = require('./bignum/bn');

asn1.define = require('./api').define;
asn1.base = require('./base/index');
asn1.constants = require('./constants/index');
asn1.decoders = require('./decoders/index');
asn1.encoders = require('./encoders/index');

},{"./api":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/api.js","./base/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/index.js","./bignum/bn":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js","./constants/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/constants/index.js","./decoders/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/index.js","./encoders/index":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/buffer.js":[function(require,module,exports){
const inherits = require('util').inherits;
const Reporter = require('../base').Reporter;

function DecoderBuffer(base, options) {
    Reporter.call(this, options);
    if (!$$.Buffer.isBuffer(base)) {
        this.error('Input not $$.Buffer');
        return;
    }

    this.base = base;
    this.offset = 0;
    this.length = base.length;
}

inherits(DecoderBuffer, Reporter);
exports.DecoderBuffer = DecoderBuffer;

DecoderBuffer.prototype.save = function save() {
    return {offset: this.offset, reporter: Reporter.prototype.save.call(this)};
};

DecoderBuffer.prototype.restore = function restore(save) {
    // Return skipped data
    const res = new DecoderBuffer(this.base);
    res.offset = save.offset;
    res.length = this.offset;

    this.offset = save.offset;
    Reporter.prototype.restore.call(this, save.reporter);

    return res;
};

DecoderBuffer.prototype.isEmpty = function isEmpty() {
    return this.offset === this.length;
};

DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
    if (this.offset + 1 <= this.length)
        return this.base.readUInt8(this.offset++, true);
    else
        return this.error(fail || 'DecoderBuffer overrun');
}

DecoderBuffer.prototype.skip = function skip(bytes, fail) {
    if (!(this.offset + bytes <= this.length))
        return this.error(fail || 'DecoderBuffer overrun');

    const res = new DecoderBuffer(this.base);

    // Share reporter state
    res._reporterState = this._reporterState;

    res.offset = this.offset;
    res.length = this.offset + bytes;
    this.offset += bytes;
    return res;
}

DecoderBuffer.prototype.raw = function raw(save) {
    return this.base.slice(save ? save.offset : this.offset, this.length);
}

function EncoderBuffer(value, reporter) {
    if (Array.isArray(value)) {
        this.length = 0;
        this.value = value.map(function (item) {
            if (!(item instanceof EncoderBuffer))
                item = new EncoderBuffer(item, reporter);
            this.length += item.length;
            return item;
        }, this);
    } else if (typeof value === 'number') {
        if (!(0 <= value && value <= 0xff))
            return reporter.error('non-byte EncoderBuffer value');
        this.value = value;
        this.length = 1;
    } else if (typeof value === 'string') {
        this.value = value;
        this.length = $$.Buffer.byteLength(value);
    } else if ($$.Buffer.isBuffer(value)) {
        this.value = value;
        this.length = value.length;
    } else {
        return reporter.error('Unsupported type: ' + typeof value);
    }
}

exports.EncoderBuffer = EncoderBuffer;

EncoderBuffer.prototype.join = function join(out, offset) {
    if (!out)
        out = $$.Buffer.alloc(this.length);
    if (!offset)
        offset = 0;

    if (this.length === 0)
        return out;

    if (Array.isArray(this.value)) {
        this.value.forEach(function (item) {
            item.join(out, offset);
            offset += item.length;
        });
    } else {
        if (typeof this.value === 'number')
            out[offset] = this.value;
        else if (typeof this.value === 'string')
            out.write(this.value, offset);
        else if ($$.Buffer.isBuffer(this.value))
            this.value.copy(out, offset);
        offset += this.length;
    }

    return out;
};

},{"../base":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/index.js","util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/index.js":[function(require,module,exports){
var base = exports;

base.Reporter = require('./reporter').Reporter;
base.DecoderBuffer = require('./buffer').DecoderBuffer;
base.EncoderBuffer = require('./buffer').EncoderBuffer;
base.Node = require('./node');

},{"./buffer":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/buffer.js","./node":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/node.js","./reporter":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/reporter.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/node.js":[function(require,module,exports){
var Reporter = require('../base').Reporter;
var EncoderBuffer = require('../base').EncoderBuffer;
//var assert = require('double-check').assert;

// Supported tags
var tags = [
  'seq', 'seqof', 'set', 'setof', 'octstr', 'bitstr', 'objid', 'bool',
  'gentime', 'utctime', 'null_', 'enum', 'int', 'ia5str', 'utf8str'
];

// Public methods list
var methods = [
  'key', 'obj', 'use', 'optional', 'explicit', 'implicit', 'def', 'choice',
  'any'
].concat(tags);

// Overrided methods list
var overrided = [
  '_peekTag', '_decodeTag', '_use',
  '_decodeStr', '_decodeObjid', '_decodeTime',
  '_decodeNull', '_decodeInt', '_decodeBool', '_decodeList',

  '_encodeComposite', '_encodeStr', '_encodeObjid', '_encodeTime',
  '_encodeNull', '_encodeInt', '_encodeBool'
];

function Node(enc, parent) {
  var state = {};
  this._baseState = state;

  state.enc = enc;

  state.parent = parent || null;
  state.children = null;

  // State
  state.tag = null;
  state.args = null;
  state.reverseArgs = null;
  state.choice = null;
  state.optional = false;
  state.any = false;
  state.obj = false;
  state.use = null;
  state.useDecoder = null;
  state.key = null;
  state['default'] = null;
  state.explicit = null;
  state.implicit = null;

  // Should create new instance on each method
  if (!state.parent) {
    state.children = [];
    this._wrap();
  }
}
module.exports = Node;

var stateProps = [
  'enc', 'parent', 'children', 'tag', 'args', 'reverseArgs', 'choice',
  'optional', 'any', 'obj', 'use', 'alteredUse', 'key', 'default', 'explicit',
  'implicit'
];

Node.prototype.clone = function clone() {
  var state = this._baseState;
  var cstate = {};
  stateProps.forEach(function(prop) {
    cstate[prop] = state[prop];
  });
  var res = new this.constructor(cstate.parent);
  res._baseState = cstate;
  return res;
};

Node.prototype._wrap = function wrap() {
  var state = this._baseState;
  methods.forEach(function(method) {
    this[method] = function _wrappedMethod() {
      var clone = new this.constructor(this);
      state.children.push(clone);
      return clone[method].apply(clone, arguments);
    };
  }, this);
};

Node.prototype._init = function init(body) {
  var state = this._baseState;

  //assert.equal(state.parent,null,'state.parent should be null');
  body.call(this);

  // Filter children
  state.children = state.children.filter(function(child) {
    return child._baseState.parent === this;
  }, this);
  // assert.equal(state.children.length, 1, 'Root node can have only one child');
};

Node.prototype._useArgs = function useArgs(args) {
  var state = this._baseState;

  // Filter children and args
  var children = args.filter(function(arg) {
    return arg instanceof this.constructor;
  }, this);
  args = args.filter(function(arg) {
    return !(arg instanceof this.constructor);
  }, this);

  if (children.length !== 0) {
    // assert.equal(state.children, null, 'state.children should be null');
    state.children = children;

    // Replace parent to maintain backward link
    children.forEach(function(child) {
      child._baseState.parent = this;
    }, this);
  }
  if (args.length !== 0) {
    // assert.equal(state.args, null, 'state.args should be null');
    state.args = args;
    state.reverseArgs = args.map(function(arg) {
      if (typeof arg !== 'object' || arg.constructor !== Object)
        return arg;

      var res = {};
      Object.keys(arg).forEach(function(key) {
        if (key == (key | 0))
          key |= 0;
        var value = arg[key];
        res[value] = key;
      });
      return res;
    });
  }
};

//
// Overrided methods
//

overrided.forEach(function(method) {
  Node.prototype[method] = function _overrided() {
    var state = this._baseState;
    throw new Error(method + ' not implemented for encoding: ' + state.enc);
  };
});

//
// Public methods
//

tags.forEach(function(tag) {
  Node.prototype[tag] = function _tagMethod() {
    var state = this._baseState;
    var args = Array.prototype.slice.call(arguments);

    // assert.equal(state.tag, null, 'state.tag should be null');
    state.tag = tag;

    this._useArgs(args);

    return this;
  };
});

Node.prototype.use = function use(item) {
  var state = this._baseState;

  // assert.equal(state.use, null, 'state.use should be null');
  state.use = item;

  return this;
};

Node.prototype.optional = function optional() {
  var state = this._baseState;

  state.optional = true;

  return this;
};

Node.prototype.def = function def(val) {
  var state = this._baseState;

  // assert.equal(state['default'], null, "state['default'] should be null");
  state['default'] = val;
  state.optional = true;

  return this;
};

Node.prototype.explicit = function explicit(num) {
  var state = this._baseState;

  // assert.equal(state.explicit,null, 'state.explicit should be null');
  // assert.equal(state.implicit,null, 'state.implicit should be null');

  state.explicit = num;

  return this;
};

Node.prototype.implicit = function implicit(num) {
  var state = this._baseState;

    // assert.equal(state.explicit,null, 'state.explicit should be null');
    // assert.equal(state.implicit,null, 'state.implicit should be null');

    state.implicit = num;

  return this;
};

Node.prototype.obj = function obj() {
  var state = this._baseState;
  var args = Array.prototype.slice.call(arguments);

  state.obj = true;

  if (args.length !== 0)
    this._useArgs(args);

  return this;
};

Node.prototype.key = function key(newKey) {
  var state = this._baseState;

  // assert.equal(state.key, null, 'state.key should be null');
  state.key = newKey;

  return this;
};

Node.prototype.any = function any() {
  var state = this._baseState;

  state.any = true;

  return this;
};

Node.prototype.choice = function choice(obj) {
  var state = this._baseState;

  // assert.equal(state.choice, null,'state.choice should be null');
  state.choice = obj;
  this._useArgs(Object.keys(obj).map(function(key) {
    return obj[key];
  }));

  return this;
};

//
// Decoding
//

Node.prototype._decode = function decode(input) {
  var state = this._baseState;

  // Decode root node
  if (state.parent === null)
    return input.wrapResult(state.children[0]._decode(input));

  var result = state['default'];
  var present = true;

  var prevKey;
  if (state.key !== null)
    prevKey = input.enterKey(state.key);

  // Check if tag is there
  if (state.optional) {
    var tag = null;
    if (state.explicit !== null)
      tag = state.explicit;
    else if (state.implicit !== null)
      tag = state.implicit;
    else if (state.tag !== null)
      tag = state.tag;

    if (tag === null && !state.any) {
      // Trial and Error
      var save = input.save();
      try {
        if (state.choice === null)
          this._decodeGeneric(state.tag, input);
        else
          this._decodeChoice(input);
        present = true;
      } catch (e) {
        present = false;
      }
      input.restore(save);
    } else {
      present = this._peekTag(input, tag, state.any);

      if (input.isError(present))
        return present;
    }
  }

  // Push object on stack
  var prevObj;
  if (state.obj && present)
    prevObj = input.enterObject();

  if (present) {
    // Unwrap explicit values
    if (state.explicit !== null) {
      var explicit = this._decodeTag(input, state.explicit);
      if (input.isError(explicit))
        return explicit;
      input = explicit;
    }

    // Unwrap implicit and normal values
    if (state.use === null && state.choice === null) {
      if (state.any)
        var save = input.save();
      var body = this._decodeTag(
        input,
        state.implicit !== null ? state.implicit : state.tag,
        state.any
      );
      if (input.isError(body))
        return body;

      if (state.any)
        result = input.raw(save);
      else
        input = body;
    }

    // Select proper method for tag
    if (state.any)
      result = result;
    else if (state.choice === null)
      result = this._decodeGeneric(state.tag, input);
    else
      result = this._decodeChoice(input);

    if (input.isError(result))
      return result;

    // Decode children
    if (!state.any && state.choice === null && state.children !== null) {
      var fail = state.children.some(function decodeChildren(child) {
        // NOTE: We are ignoring errors here, to let parser continue with other
        // parts of encoded data
        child._decode(input);
      });
      if (fail)
        return err;
    }
  }

  // Pop object
  if (state.obj && present)
    result = input.leaveObject(prevObj);

  // Set key
  if (state.key !== null && (result !== null || present === true))
    input.leaveKey(prevKey, state.key, result);

  return result;
};

Node.prototype._decodeGeneric = function decodeGeneric(tag, input) {
  var state = this._baseState;

  if (tag === 'seq' || tag === 'set')
    return null;
  if (tag === 'seqof' || tag === 'setof')
    return this._decodeList(input, tag, state.args[0]);
  else if (tag === 'octstr' || tag === 'bitstr')
    return this._decodeStr(input, tag);
  else if (tag === 'ia5str' || tag === 'utf8str')
    return this._decodeStr(input, tag);
  else if (tag === 'objid' && state.args)
    return this._decodeObjid(input, state.args[0], state.args[1]);
  else if (tag === 'objid')
    return this._decodeObjid(input, null, null);
  else if (tag === 'gentime' || tag === 'utctime')
    return this._decodeTime(input, tag);
  else if (tag === 'null_')
    return this._decodeNull(input);
  else if (tag === 'bool')
    return this._decodeBool(input);
  else if (tag === 'int' || tag === 'enum')
    return this._decodeInt(input, state.args && state.args[0]);
  else if (state.use !== null)
    return this._getUse(state.use, input._reporterState.obj)._decode(input);
  else
    return input.error('unknown tag: ' + tag);

  return null;
};

Node.prototype._getUse = function _getUse(entity, obj) {

  var state = this._baseState;
  // Create altered use decoder if implicit is set
  state.useDecoder = this._use(entity, obj);
  // assert.equal(state.useDecoder._baseState.parent, null, 'state.useDecoder._baseState.parent should be null');
  state.useDecoder = state.useDecoder._baseState.children[0];
  if (state.implicit !== state.useDecoder._baseState.implicit) {
    state.useDecoder = state.useDecoder.clone();
    state.useDecoder._baseState.implicit = state.implicit;
  }
  return state.useDecoder;
};

Node.prototype._decodeChoice = function decodeChoice(input) {
  var state = this._baseState;
  var result = null;
  var match = false;

  Object.keys(state.choice).some(function(key) {
    var save = input.save();
    var node = state.choice[key];
    try {
      var value = node._decode(input);
      if (input.isError(value))
        return false;

      result = { type: key, value: value };
      match = true;
    } catch (e) {
      input.restore(save);
      return false;
    }
    return true;
  }, this);

  if (!match)
    return input.error('Choice not matched');

  return result;
};

//
// Encoding
//

Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
  return new EncoderBuffer(data, this.reporter);
};

Node.prototype._encode = function encode(data, reporter, parent) {
  var state = this._baseState;
  if (state['default'] !== null && state['default'] === data)
    return;

  var result = this._encodeValue(data, reporter, parent);
  if (result === undefined)
    return;

  if (this._skipDefault(result, reporter, parent))
    return;

  return result;
};

Node.prototype._encodeValue = function encode(data, reporter, parent) {
  var state = this._baseState;

  // Decode root node
  if (state.parent === null)
    return state.children[0]._encode(data, reporter || new Reporter());

  var result = null;
  var present = true;

  // Set reporter to share it with a child class
  this.reporter = reporter;

  // Check if data is there
  if (state.optional && data === undefined) {
    if (state['default'] !== null)
      data = state['default']
    else
      return;
  }

  // For error reporting
  var prevKey;

  // Encode children first
  var content = null;
  var primitive = false;
  if (state.any) {
    // Anything that was given is translated to buffer
    result = this._createEncoderBuffer(data);
  } else if (state.choice) {
    result = this._encodeChoice(data, reporter);
  } else if (state.children) {
    content = state.children.map(function(child) {
      if (child._baseState.tag === 'null_')
        return child._encode(null, reporter, data);

      if (child._baseState.key === null)
        return reporter.error('Child should have a key');
      var prevKey = reporter.enterKey(child._baseState.key);

      if (typeof data !== 'object')
        return reporter.error('Child expected, but input is not object');

      var res = child._encode(data[child._baseState.key], reporter, data);
      reporter.leaveKey(prevKey);

      return res;
    }, this).filter(function(child) {
      return child;
    });

    content = this._createEncoderBuffer(content);
  } else {
    if (state.tag === 'seqof' || state.tag === 'setof') {
      // TODO(indutny): this should be thrown on DSL level
      if (!(state.args && state.args.length === 1))
        return reporter.error('Too many args for : ' + state.tag);

      if (!Array.isArray(data))
        return reporter.error('seqof/setof, but data is not Array');

      var child = this.clone();
      child._baseState.implicit = null;
      content = this._createEncoderBuffer(data.map(function(item) {
        var state = this._baseState;

        return this._getUse(state.args[0], data)._encode(item, reporter);
      }, child));
    } else if (state.use !== null) {
      result = this._getUse(state.use, parent)._encode(data, reporter);
    } else {
      content = this._encodePrimitive(state.tag, data);
      primitive = true;
    }
  }

  // Encode data itself
  var result;
  if (!state.any && state.choice === null) {
    var tag = state.implicit !== null ? state.implicit : state.tag;
    var cls = state.implicit === null ? 'universal' : 'context';

    if (tag === null) {
      if (state.use === null)
        reporter.error('Tag could be ommited only for .use()');
    } else {
      if (state.use === null)
        result = this._encodeComposite(tag, primitive, cls, content);
    }
  }

  // Wrap in explicit
  if (state.explicit !== null)
    result = this._encodeComposite(state.explicit, false, 'context', result);

  return result;
};

Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
  var state = this._baseState;

  var node = state.choice[data.type];
  // if (!node) {
  //   assert(
  //       false,
  //       data.type + ' not found in ' +
  //           JSON.stringify(Object.keys(state.choice)));
  // }
  return node._encode(data.value, reporter);
};

Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
  var state = this._baseState;

  if (tag === 'octstr' || tag === 'bitstr' || tag === 'ia5str')
    return this._encodeStr(data, tag);
  else if (tag === 'utf8str')
    return this._encodeStr(data, tag);
  else if (tag === 'objid' && state.args)
    return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);
  else if (tag === 'objid')
    return this._encodeObjid(data, null, null);
  else if (tag === 'gentime' || tag === 'utctime')
    return this._encodeTime(data, tag);
  else if (tag === 'null_')
    return this._encodeNull();
  else if (tag === 'int' || tag === 'enum')
    return this._encodeInt(data, state.args && state.reverseArgs[0]);
  else if (tag === 'bool')
    return this._encodeBool(data);
  else
    throw new Error('Unsupported tag: ' + tag);
};

},{"../base":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/base/reporter.js":[function(require,module,exports){
var inherits = require('util').inherits;

function Reporter(options) {
  this._reporterState = {
    obj: null,
    path: [],
    options: options || {},
    errors: []
  };
}
exports.Reporter = Reporter;

Reporter.prototype.isError = function isError(obj) {
  return obj instanceof ReporterError;
};

Reporter.prototype.save = function save() {
  var state = this._reporterState;

  return { obj: state.obj, pathLen: state.path.length };
};

Reporter.prototype.restore = function restore(data) {
  var state = this._reporterState;

  state.obj = data.obj;
  state.path = state.path.slice(0, data.pathLen);
};

Reporter.prototype.enterKey = function enterKey(key) {
  return this._reporterState.path.push(key);
};

Reporter.prototype.leaveKey = function leaveKey(index, key, value) {
  var state = this._reporterState;

  state.path = state.path.slice(0, index - 1);
  if (state.obj !== null)
    state.obj[key] = value;
};

Reporter.prototype.enterObject = function enterObject() {
  var state = this._reporterState;

  var prev = state.obj;
  state.obj = {};
  return prev;
};

Reporter.prototype.leaveObject = function leaveObject(prev) {
  var state = this._reporterState;

  var now = state.obj;
  state.obj = prev;
  return now;
};

Reporter.prototype.error = function error(msg) {
  var err;
  var state = this._reporterState;

  var inherited = msg instanceof ReporterError;
  if (inherited) {
    err = msg;
  } else {
    err = new ReporterError(state.path.map(function(elem) {
      return '[' + JSON.stringify(elem) + ']';
    }).join(''), msg.message || msg, msg.stack);
  }

  if (!state.options.partial)
    throw err;

  if (!inherited)
    state.errors.push(err);

  return err;
};

Reporter.prototype.wrapResult = function wrapResult(result) {
  var state = this._reporterState;
  if (!state.options.partial)
    return result;

  return {
    result: this.isError(result) ? null : result,
    errors: state.errors
  };
};

function ReporterError(path, msg) {
  this.path = path;
  this.rethrow(msg);
};
inherits(ReporterError, Error);

ReporterError.prototype.rethrow = function rethrow(msg) {
  this.message = msg + ' at: ' + (this.path || '(shallow)');
  Error.captureStackTrace(this, ReporterError);

  return this;
};

},{"util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js":[function(require,module,exports){
(function (module, exports) {

'use strict';

// Utils

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

// Could use `inherits` module, but don't want to move from single file
// architecture yet.
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  var TempCtor = function () {};
  TempCtor.prototype = superCtor.prototype;
  ctor.prototype = new TempCtor();
  ctor.prototype.constructor = ctor;
}

// BN

function BN(number, base, endian) {
  // May be `new BN(bn)` ?
  if (number !== null &&
      typeof number === 'object' &&
      Array.isArray(number.words)) {
    return number;
  }

  this.sign = false;
  this.words = null;
  this.length = 0;

  // Reduction context
  this.red = null;

  if (base === 'le' || base === 'be') {
    endian = base;
    base = 10;
  }

  if (number !== null)
    this._init(number || 0, base || 10, endian || 'be');
}
if (typeof module === 'object')
  module.exports = BN;
else
  exports.BN = BN;

BN.BN = BN;
BN.wordSize = 26;

BN.prototype._init = function init(number, base, endian) {
  if (typeof number === 'number') {
    return this._initNumber(number, base, endian);
  } else if (typeof number === 'object') {
    return this._initArray(number, base, endian);
  }
  if (base === 'hex')
    base = 16;
  assert(base === (base | 0) && base >= 2 && base <= 36);

  number = number.toString().replace(/\s+/g, '');
  var start = 0;
  if (number[0] === '-')
    start++;

  if (base === 16)
    this._parseHex(number, start);
  else
    this._parseBase(number, base, start);

  if (number[0] === '-')
    this.sign = true;

  this.strip();

  if (endian !== 'le')
    return;

  this._initArray(this.toArray(), base, endian);
};

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    this.strip();

    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    var res = allocate(ArrayType, reqLength);
    var postfix = endian === 'le' ? 'LE' : 'BE';
    this['_toArrayLike' + postfix](res, byteLength);
    return res;
  };

  var allocate = function allocate (ArrayType, size) {
    if (ArrayType.allocUnsafe) {
      return ArrayType.allocUnsafe(size);
    }
    return new ArrayType(size);
  };

  BN.prototype._toArrayLikeLE = function _toArrayLikeLE (res, byteLength) {
    var position = 0;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position++] = word & 0xff;
      if (position < res.length) {
        res[position++] = (word >> 8) & 0xff;
      }
      if (position < res.length) {
        res[position++] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position < res.length) {
          res[position++] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position < res.length) {
      res[position++] = carry;

      while (position < res.length) {
        res[position++] = 0;
      }
    }
  };

  BN.prototype._toArrayLikeBE = function _toArrayLikeBE (res, byteLength) {
    var position = res.length - 1;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position--] = word & 0xff;
      if (position >= 0) {
        res[position--] = (word >> 8) & 0xff;
      }
      if (position >= 0) {
        res[position--] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position >= 0) {
          res[position--] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position >= 0) {
      res[position--] = carry;

      while (position >= 0) {
        res[position--] = 0;
      }
    }
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }



BN.prototype._initNumber = function _initNumber(number, base, endian) {
  if (number < 0) {
    this.sign = true;
    number = -number;
  }
  if (number < 0x4000000) {
    this.words = [ number & 0x3ffffff ];
    this.length = 1;
  } else if (number < 0x10000000000000) {
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff
    ];
    this.length = 2;
  } else {
    assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff,
      1
    ];
    this.length = 3;
  }

  if (endian !== 'le')
    return;

  // Reverse the bytes
  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initArray = function _initArray(number, base, endian) {
  // Perhaps a Uint8Array
  assert(typeof number.length === 'number');
  if (number.length <= 0) {
    this.words = [ 0 ];
    this.length = 1;
    return this;
  }

  this.length = Math.ceil(number.length / 3);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  var off = 0;
  if (endian === 'be') {
    for (var i = number.length - 1, j = 0; i >= 0; i -= 3) {
      var w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  } else if (endian === 'le') {
    for (var i = 0, j = 0; i < number.length; i += 3) {
      var w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  }
  return this.strip();
};

function parseHex(str, start, end) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r <<= 4;

    // 'a' - 'f'
    if (c >= 49 && c <= 54)
      r |= c - 49 + 0xa;

    // 'A' - 'F'
    else if (c >= 17 && c <= 22)
      r |= c - 17 + 0xa;

    // '0' - '9'
    else
      r |= c & 0xf;
  }
  return r;
}

BN.prototype._parseHex = function _parseHex(number, start) {
  // Create possibly bigger array to ensure that it fits the number
  this.length = Math.ceil((number.length - start) / 6);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  // Scan 24-bit chunks and add them to the number
  var off = 0;
  for (var i = number.length - 6, j = 0; i >= start; i -= 6) {
    var w = parseHex(number, i, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    off += 24;
    if (off >= 26) {
      off -= 26;
      j++;
    }
  }
  if (i + 6 !== start) {
    var w = parseHex(number, start, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
  }
  this.strip();
};

function parseBase(str, start, end, mul) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r *= mul;

    // 'a'
    if (c >= 49)
      r += c - 49 + 0xa;

    // 'A'
    else if (c >= 17)
      r += c - 17 + 0xa;

    // '0' - '9'
    else
      r += c;
  }
  return r;
}

BN.prototype._parseBase = function _parseBase(number, base, start) {
  // Initialize as zero
  this.words = [ 0 ];
  this.length = 1;

  // Find length of limb in base
  for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base)
    limbLen++;
  limbLen--;
  limbPow = (limbPow / base) | 0;

  var total = number.length - start;
  var mod = total % limbLen;
  var end = Math.min(total, total - mod) + start;

  var word = 0;
  for (var i = start; i < end; i += limbLen) {
    word = parseBase(number, i, i + limbLen, base);

    this.imuln(limbPow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }

  if (mod !== 0) {
    var pow = 1;
    var word = parseBase(number, i, number.length, base);

    for (var i = 0; i < mod; i++)
      pow *= base;
    this.imuln(pow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }
};

BN.prototype.copy = function copy(dest) {
  dest.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    dest.words[i] = this.words[i];
  dest.length = this.length;
  dest.sign = this.sign;
  dest.red = this.red;
};

BN.prototype.clone = function clone() {
  var r = new BN(null);
  this.copy(r);
  return r;
};

// Remove leading `0` from `this`
BN.prototype.strip = function strip() {
  while (this.length > 1 && this.words[this.length - 1] === 0)
    this.length--;
  return this._normSign();
};

BN.prototype._normSign = function _normSign() {
  // -0 = 0
  if (this.length === 1 && this.words[0] === 0)
    this.sign = false;
  return this;
};

BN.prototype.inspect = function inspect() {
  return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
};

/*

var zeros = [];
var groupSizes = [];
var groupBases = [];

var s = '';
var i = -1;
while (++i < BN.wordSize) {
  zeros[i] = s;
  s += '0';
}
groupSizes[0] = 0;
groupSizes[1] = 0;
groupBases[0] = 0;
groupBases[1] = 0;
var base = 2 - 1;
while (++base < 36 + 1) {
  var groupSize = 0;
  var groupBase = 1;
  while (groupBase < (1 << BN.wordSize) / base) {
    groupBase *= base;
    groupSize += 1;
  }
  groupSizes[base] = groupSize;
  groupBases[base] = groupBase;
}

*/

var zeros = [
  '',
  '0',
  '00',
  '000',
  '0000',
  '00000',
  '000000',
  '0000000',
  '00000000',
  '000000000',
  '0000000000',
  '00000000000',
  '000000000000',
  '0000000000000',
  '00000000000000',
  '000000000000000',
  '0000000000000000',
  '00000000000000000',
  '000000000000000000',
  '0000000000000000000',
  '00000000000000000000',
  '000000000000000000000',
  '0000000000000000000000',
  '00000000000000000000000',
  '000000000000000000000000',
  '0000000000000000000000000'
];

var groupSizes = [
  0, 0,
  25, 16, 12, 11, 10, 9, 8,
  8, 7, 7, 7, 7, 6, 6,
  6, 6, 6, 6, 6, 5, 5,
  5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5
];

var groupBases = [
  0, 0,
  33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
  43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
  16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
  6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
  24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
];

BN.prototype.toString = function toString(base, padding) {
  base = base || 10;
  if (base === 16 || base === 'hex') {
    var out = '';
    var off = 0;
    var padding = padding | 0 || 1;
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = this.words[i];
      var word = (((w << off) | carry) & 0xffffff).toString(16);
      carry = (w >>> (24 - off)) & 0xffffff;
      if (carry !== 0 || i !== this.length - 1)
        out = zeros[6 - word.length] + word + out;
      else
        out = word + out;
      off += 2;
      if (off >= 26) {
        off -= 26;
        i--;
      }
    }
    if (carry !== 0)
      out = carry.toString(16) + out;
    while (out.length % padding !== 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else if (base === (base | 0) && base >= 2 && base <= 36) {
    // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
    var groupSize = groupSizes[base];
    // var groupBase = Math.pow(base, groupSize);
    var groupBase = groupBases[base];
    var out = '';
    var c = this.clone();
    c.sign = false;
    while (c.cmpn(0) !== 0) {
      var r = c.modn(groupBase).toString(base);
      c = c.idivn(groupBase);

      if (c.cmpn(0) !== 0)
        out = zeros[groupSize - r.length] + r + out;
      else
        out = r + out;
    }
    if (this.cmpn(0) === 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else {
    assert(false, 'Base should be between 2 and 36');
  }
};

BN.prototype.toJSON = function toJSON() {
  return this.toString(16);
};

BN.prototype.toArray = function toArray(endian) {
  this.strip();
  var res = new Array(this.byteLength());
  res[0] = 0;

  var q = this.clone();
  if (endian !== 'le') {
    // Assume big-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[res.length - i - 1] = b;
    }
  } else {
    // Assume little-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[i] = b;
    }
  }

  return res;
};

if (Math.clz32) {
  BN.prototype._countBits = function _countBits(w) {
    return 32 - Math.clz32(w);
  };
} else {
  BN.prototype._countBits = function _countBits(w) {
    var t = w;
    var r = 0;
    if (t >= 0x1000) {
      r += 13;
      t >>>= 13;
    }
    if (t >= 0x40) {
      r += 7;
      t >>>= 7;
    }
    if (t >= 0x8) {
      r += 4;
      t >>>= 4;
    }
    if (t >= 0x02) {
      r += 2;
      t >>>= 2;
    }
    return r + t;
  };
}

BN.prototype._zeroBits = function _zeroBits(w) {
  // Short-cut
  if (w === 0)
    return 26;

  var t = w;
  var r = 0;
  if ((t & 0x1fff) === 0) {
    r += 13;
    t >>>= 13;
  }
  if ((t & 0x7f) === 0) {
    r += 7;
    t >>>= 7;
  }
  if ((t & 0xf) === 0) {
    r += 4;
    t >>>= 4;
  }
  if ((t & 0x3) === 0) {
    r += 2;
    t >>>= 2;
  }
  if ((t & 0x1) === 0)
    r++;
  return r;
};

// Return number of used bits in a BN
BN.prototype.bitLength = function bitLength() {
  var hi = 0;
  var w = this.words[this.length - 1];
  var hi = this._countBits(w);
  return (this.length - 1) * 26 + hi;
};

// Number of trailing zero bits
BN.prototype.zeroBits = function zeroBits() {
  if (this.cmpn(0) === 0)
    return 0;

  var r = 0;
  for (var i = 0; i < this.length; i++) {
    var b = this._zeroBits(this.words[i]);
    r += b;
    if (b !== 26)
      break;
  }
  return r;
};

BN.prototype.byteLength = function byteLength() {
  return Math.ceil(this.bitLength() / 8);
};

// Return negative clone of `this`
BN.prototype.neg = function neg() {
  if (this.cmpn(0) === 0)
    return this.clone();

  var r = this.clone();
  r.sign = !this.sign;
  return r;
};


// Or `num` with `this` in-place
BN.prototype.ior = function ior(num) {
  this.sign = this.sign || num.sign;

  while (this.length < num.length)
    this.words[this.length++] = 0;

  for (var i = 0; i < num.length; i++)
    this.words[i] = this.words[i] | num.words[i];

  return this.strip();
};


// Or `num` with `this`
BN.prototype.or = function or(num) {
  if (this.length > num.length)
    return this.clone().ior(num);
  else
    return num.clone().ior(this);
};


// And `num` with `this` in-place
BN.prototype.iand = function iand(num) {
  this.sign = this.sign && num.sign;

  // b = min-length(num, this)
  var b;
  if (this.length > num.length)
    b = num;
  else
    b = this;

  for (var i = 0; i < b.length; i++)
    this.words[i] = this.words[i] & num.words[i];

  this.length = b.length;

  return this.strip();
};


// And `num` with `this`
BN.prototype.and = function and(num) {
  if (this.length > num.length)
    return this.clone().iand(num);
  else
    return num.clone().iand(this);
};


// Xor `num` with `this` in-place
BN.prototype.ixor = function ixor(num) {
  this.sign = this.sign || num.sign;

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  for (var i = 0; i < b.length; i++)
    this.words[i] = a.words[i] ^ b.words[i];

  if (this !== a)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];

  this.length = a.length;

  return this.strip();
};


// Xor `num` with `this`
BN.prototype.xor = function xor(num) {
  if (this.length > num.length)
    return this.clone().ixor(num);
  else
    return num.clone().ixor(this);
};


// Set `bit` of `this`
BN.prototype.setn = function setn(bit, val) {
  assert(typeof bit === 'number' && bit >= 0);

  var off = (bit / 26) | 0;
  var wbit = bit % 26;

  while (this.length <= off)
    this.words[this.length++] = 0;

  if (val)
    this.words[off] = this.words[off] | (1 << wbit);
  else
    this.words[off] = this.words[off] & ~(1 << wbit);

  return this.strip();
};


// Add `num` to `this` in-place
BN.prototype.iadd = function iadd(num) {
  // negative + positive
  if (this.sign && !num.sign) {
    this.sign = false;
    var r = this.isub(num);
    this.sign = !this.sign;
    return this._normSign();

  // positive + negative
  } else if (!this.sign && num.sign) {
    num.sign = false;
    var r = this.isub(num);
    num.sign = true;
    return r._normSign();
  }

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] + b.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }

  this.length = a.length;
  if (carry !== 0) {
    this.words[this.length] = carry;
    this.length++;
  // Copy the rest of the words
  } else if (a !== this) {
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  }

  return this;
};

// Add `num` to `this`
BN.prototype.add = function add(num) {
  if (num.sign && !this.sign) {
    num.sign = false;
    var res = this.sub(num);
    num.sign = true;
    return res;
  } else if (!num.sign && this.sign) {
    this.sign = false;
    var res = num.sub(this);
    this.sign = true;
    return res;
  }

  if (this.length > num.length)
    return this.clone().iadd(num);
  else
    return num.clone().iadd(this);
};

// Subtract `num` from `this` in-place
BN.prototype.isub = function isub(num) {
  // this - (-num) = this + num
  if (num.sign) {
    num.sign = false;
    var r = this.iadd(num);
    num.sign = true;
    return r._normSign();

  // -this - num = -(this + num)
  } else if (this.sign) {
    this.sign = false;
    this.iadd(num);
    this.sign = true;
    return this._normSign();
  }

  // At this point both numbers are positive
  var cmp = this.cmp(num);

  // Optimization - zeroify
  if (cmp === 0) {
    this.sign = false;
    this.length = 1;
    this.words[0] = 0;
    return this;
  }

  // a > b
  var a;
  var b;
  if (cmp > 0) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] - b.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }

  // Copy rest of the words
  if (carry === 0 && i < a.length && a !== this)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  this.length = Math.max(this.length, i);

  if (a !== this)
    this.sign = true;

  return this.strip();
};

// Subtract `num` from `this`
BN.prototype.sub = function sub(num) {
  return this.clone().isub(num);
};

/*
// NOTE: This could be potentionally used to generate loop-less multiplications
function _genCombMulTo(alen, blen) {
  var len = alen + blen - 1;
  var src = [
    'var a = this.words, b = num.words, o = out.words, c = 0, w, ' +
        'mask = 0x3ffffff, shift = 0x4000000;',
    'out.length = ' + len + ';'
  ];
  for (var k = 0; k < len; k++) {
    var minJ = Math.max(0, k - alen + 1);
    var maxJ = Math.min(k, blen - 1);

    for (var j = minJ; j <= maxJ; j++) {
      var i = k - j;
      var mul = 'a[' + i + '] * b[' + j + ']';

      if (j === minJ) {
        src.push('w = ' + mul + ' + c;');
        src.push('c = (w / shift) | 0;');
      } else {
        src.push('w += ' + mul + ';');
        src.push('c += (w / shift) | 0;');
      }
      src.push('w &= mask;');
    }
    src.push('o[' + k + '] = w;');
  }
  src.push('if (c !== 0) {',
           '  o[' + k + '] = c;',
           '  out.length++;',
           '}',
           'return out;');

  return src.join('\n');
}
*/

BN.prototype._smallMulTo = function _smallMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = carry >>> 26;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;
    }
    out.words[k] = rword;
    carry = ncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype._bigMulTo = function _bigMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  var hncarry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = hncarry;
    hncarry = 0;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;

      hncarry += ncarry >>> 26;
      ncarry &= 0x3ffffff;
    }
    out.words[k] = rword;
    carry = ncarry;
    ncarry = hncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype.mulTo = function mulTo(num, out) {
  var res;
  if (this.length + num.length < 63)
    res = this._smallMulTo(num, out);
  else
    res = this._bigMulTo(num, out);
  return res;
};

// Multiply `this` by `num`
BN.prototype.mul = function mul(num) {
  var out = new BN(null);
  out.words = new Array(this.length + num.length);
  return this.mulTo(num, out);
};

// In-place Multiplication
BN.prototype.imul = function imul(num) {
  if (this.cmpn(0) === 0 || num.cmpn(0) === 0) {
    this.words[0] = 0;
    this.length = 1;
    return this;
  }

  var tlen = this.length;
  var nlen = num.length;

  this.sign = num.sign !== this.sign;
  this.length = this.length + num.length;
  this.words[this.length - 1] = 0;

  for (var k = this.length - 2; k >= 0; k--) {
    // Sum all words with the same `i + j = k` and accumulate `carry`,
    // note that carry could be >= 0x3ffffff
    var carry = 0;
    var rword = 0;
    var maxJ = Math.min(k, nlen - 1);
    for (var j = Math.max(0, k - tlen + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i];
      var b = num.words[j];
      var r = a * b;

      var lo = r & 0x3ffffff;
      carry += (r / 0x4000000) | 0;
      lo += rword;
      rword = lo & 0x3ffffff;
      carry += lo >>> 26;
    }
    this.words[k] = rword;
    this.words[k + 1] += carry;
    carry = 0;
  }

  // Propagate overflows
  var carry = 0;
  for (var i = 1; i < this.length; i++) {
    var w = this.words[i] + carry;
    this.words[i] = w & 0x3ffffff;
    carry = w >>> 26;
  }

  return this.strip();
};

BN.prototype.imuln = function imuln(num) {
  assert(typeof num === 'number');

  // Carry
  var carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = this.words[i] * num;
    var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
    carry >>= 26;
    carry += (w / 0x4000000) | 0;
    // NOTE: lo is 27bit maximum
    carry += lo >>> 26;
    this.words[i] = lo & 0x3ffffff;
  }

  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }

  return this;
};

BN.prototype.muln = function muln(num) {
  return this.clone().imuln(num);
};

// `this` * `this`
BN.prototype.sqr = function sqr() {
  return this.mul(this);
};

// `this` * `this` in-place
BN.prototype.isqr = function isqr() {
  return this.mul(this);
};

// Shift-left in-place
BN.prototype.ishln = function ishln(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;
  var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);

  if (r !== 0) {
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var newCarry = this.words[i] & carryMask;
      var c = (this.words[i] - newCarry) << r;
      this.words[i] = c | carry;
      carry = newCarry >>> (26 - r);
    }
    if (carry) {
      this.words[i] = carry;
      this.length++;
    }
  }

  if (s !== 0) {
    for (var i = this.length - 1; i >= 0; i--)
      this.words[i + s] = this.words[i];
    for (var i = 0; i < s; i++)
      this.words[i] = 0;
    this.length += s;
  }

  return this.strip();
};

// Shift-right in-place
// NOTE: `hint` is a lowest bit before trailing zeroes
// NOTE: if `extended` is present - it will be filled with destroyed bits
BN.prototype.ishrn = function ishrn(bits, hint, extended) {
  assert(typeof bits === 'number' && bits >= 0);
  var h;
  if (hint)
    h = (hint - (hint % 26)) / 26;
  else
    h = 0;

  var r = bits % 26;
  var s = Math.min((bits - r) / 26, this.length);
  var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
  var maskedWords = extended;

  h -= s;
  h = Math.max(0, h);

  // Extended mode, copy masked part
  if (maskedWords) {
    for (var i = 0; i < s; i++)
      maskedWords.words[i] = this.words[i];
    maskedWords.length = s;
  }

  if (s === 0) {
    // No-op, we should not move anything at all
  } else if (this.length > s) {
    this.length -= s;
    for (var i = 0; i < this.length; i++)
      this.words[i] = this.words[i + s];
  } else {
    this.words[0] = 0;
    this.length = 1;
  }

  var carry = 0;
  for (var i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
    var word = this.words[i];
    this.words[i] = (carry << (26 - r)) | (word >>> r);
    carry = word & mask;
  }

  // Push carried bits as a mask
  if (maskedWords && carry !== 0)
    maskedWords.words[maskedWords.length++] = carry;

  if (this.length === 0) {
    this.words[0] = 0;
    this.length = 1;
  }

  this.strip();

  return this;
};

// Shift-left
BN.prototype.shln = function shln(bits) {
  return this.clone().ishln(bits);
};

// Shift-right
BN.prototype.shrn = function shrn(bits) {
  return this.clone().ishrn(bits);
};

// Test if n bit is set
BN.prototype.testn = function testn(bit) {
  assert(typeof bit === 'number' && bit >= 0);
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    return false;
  }

  // Check bit and return
  var w = this.words[s];

  return !!(w & q);
};

// Return only lowers bits of number (in-place)
BN.prototype.imaskn = function imaskn(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;

  assert(!this.sign, 'imaskn works only with positive numbers');

  if (r !== 0)
    s++;
  this.length = Math.min(s, this.length);

  if (r !== 0) {
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    this.words[this.length - 1] &= mask;
  }

  return this.strip();
};

// Return only lowers bits of number
BN.prototype.maskn = function maskn(bits) {
  return this.clone().imaskn(bits);
};

// Add plain number `num` to `this`
BN.prototype.iaddn = function iaddn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.isubn(-num);

  // Possible sign change
  if (this.sign) {
    if (this.length === 1 && this.words[0] < num) {
      this.words[0] = num - this.words[0];
      this.sign = false;
      return this;
    }

    this.sign = false;
    this.isubn(num);
    this.sign = true;
    return this;
  }

  // Add without checks
  return this._iaddn(num);
};

BN.prototype._iaddn = function _iaddn(num) {
  this.words[0] += num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
    this.words[i] -= 0x4000000;
    if (i === this.length - 1)
      this.words[i + 1] = 1;
    else
      this.words[i + 1]++;
  }
  this.length = Math.max(this.length, i + 1);

  return this;
};

// Subtract plain number `num` from `this`
BN.prototype.isubn = function isubn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.iaddn(-num);

  if (this.sign) {
    this.sign = false;
    this.iaddn(num);
    this.sign = true;
    return this;
  }

  this.words[0] -= num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] < 0; i++) {
    this.words[i] += 0x4000000;
    this.words[i + 1] -= 1;
  }

  return this.strip();
};

BN.prototype.addn = function addn(num) {
  return this.clone().iaddn(num);
};

BN.prototype.subn = function subn(num) {
  return this.clone().isubn(num);
};

BN.prototype.iabs = function iabs() {
  this.sign = false;

  return this;
};

BN.prototype.abs = function abs() {
  return this.clone().iabs();
};

BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
  // Bigger storage is needed
  var len = num.length + shift;
  var i;
  if (this.words.length < len) {
    var t = new Array(len);
    for (var i = 0; i < this.length; i++)
      t[i] = this.words[i];
    this.words = t;
  } else {
    i = this.length;
  }

  // Zeroify rest
  this.length = Math.max(this.length, len);
  for (; i < this.length; i++)
    this.words[i] = 0;

  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var w = this.words[i + shift] + carry;
    var right = num.words[i] * mul;
    w -= right & 0x3ffffff;
    carry = (w >> 26) - ((right / 0x4000000) | 0);
    this.words[i + shift] = w & 0x3ffffff;
  }
  for (; i < this.length - shift; i++) {
    var w = this.words[i + shift] + carry;
    carry = w >> 26;
    this.words[i + shift] = w & 0x3ffffff;
  }

  if (carry === 0)
    return this.strip();

  // Subtraction overflow
  assert(carry === -1);
  carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = -this.words[i] + carry;
    carry = w >> 26;
    this.words[i] = w & 0x3ffffff;
  }
  this.sign = true;

  return this.strip();
};

BN.prototype._wordDiv = function _wordDiv(num, mode) {
  var shift = this.length - num.length;

  var a = this.clone();
  var b = num;

  // Normalize
  var bhi = b.words[b.length - 1];
  var bhiBits = this._countBits(bhi);
  shift = 26 - bhiBits;
  if (shift !== 0) {
    b = b.shln(shift);
    a.ishln(shift);
    bhi = b.words[b.length - 1];
  }

  // Initialize quotient
  var m = a.length - b.length;
  var q;

  if (mode !== 'mod') {
    q = new BN(null);
    q.length = m + 1;
    q.words = new Array(q.length);
    for (var i = 0; i < q.length; i++)
      q.words[i] = 0;
  }

  var diff = a.clone()._ishlnsubmul(b, 1, m);
  if (!diff.sign) {
    a = diff;
    if (q)
      q.words[m] = 1;
  }

  for (var j = m - 1; j >= 0; j--) {
    var qj = a.words[b.length + j] * 0x4000000 + a.words[b.length + j - 1];

    // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
    // (0x7ffffff)
    qj = Math.min((qj / bhi) | 0, 0x3ffffff);

    a._ishlnsubmul(b, qj, j);
    while (a.sign) {
      qj--;
      a.sign = false;
      a._ishlnsubmul(b, 1, j);
      if (a.cmpn(0) !== 0)
        a.sign = !a.sign;
    }
    if (q)
      q.words[j] = qj;
  }
  if (q)
    q.strip();
  a.strip();

  // Denormalize
  if (mode !== 'div' && shift !== 0)
    a.ishrn(shift);
  return { div: q ? q : null, mod: a };
};

BN.prototype.divmod = function divmod(num, mode) {
  assert(num.cmpn(0) !== 0);

  if (this.sign && !num.sign) {
    var res = this.neg().divmod(num, mode);
    var div;
    var mod;
    if (mode !== 'mod')
      div = res.div.neg();
    if (mode !== 'div')
      mod = res.mod.cmpn(0) === 0 ? res.mod : num.sub(res.mod);
    return {
      div: div,
      mod: mod
    };
  } else if (!this.sign && num.sign) {
    var res = this.divmod(num.neg(), mode);
    var div;
    if (mode !== 'mod')
      div = res.div.neg();
    return { div: div, mod: res.mod };
  } else if (this.sign && num.sign) {
    return this.neg().divmod(num.neg(), mode);
  }

  // Both numbers are positive at this point

  // Strip both numbers to approximate shift value
  if (num.length > this.length || this.cmp(num) < 0)
    return { div: new BN(0), mod: this };

  // Very short reduction
  if (num.length === 1) {
    if (mode === 'div')
      return { div: this.divn(num.words[0]), mod: null };
    else if (mode === 'mod')
      return { div: null, mod: new BN(this.modn(num.words[0])) };
    return {
      div: this.divn(num.words[0]),
      mod: new BN(this.modn(num.words[0]))
    };
  }

  return this._wordDiv(num, mode);
};

// Find `this` / `num`
BN.prototype.div = function div(num) {
  return this.divmod(num, 'div').div;
};

// Find `this` % `num`
BN.prototype.mod = function mod(num) {
  return this.divmod(num, 'mod').mod;
};

// Find Round(`this` / `num`)
BN.prototype.divRound = function divRound(num) {
  var dm = this.divmod(num);

  // Fast case - exact division
  if (dm.mod.cmpn(0) === 0)
    return dm.div;

  var mod = dm.div.sign ? dm.mod.isub(num) : dm.mod;

  var half = num.shrn(1);
  var r2 = num.andln(1);
  var cmp = mod.cmp(half);

  // Round down
  if (cmp < 0 || r2 === 1 && cmp === 0)
    return dm.div;

  // Round up
  return dm.div.sign ? dm.div.isubn(1) : dm.div.iaddn(1);
};

BN.prototype.modn = function modn(num) {
  assert(num <= 0x3ffffff);
  var p = (1 << 26) % num;

  var acc = 0;
  for (var i = this.length - 1; i >= 0; i--)
    acc = (p * acc + this.words[i]) % num;

  return acc;
};

// In-place division by number
BN.prototype.idivn = function idivn(num) {
  assert(num <= 0x3ffffff);

  var carry = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var w = this.words[i] + carry * 0x4000000;
    this.words[i] = (w / num) | 0;
    carry = w % num;
  }

  return this.strip();
};

BN.prototype.divn = function divn(num) {
  return this.clone().idivn(num);
};

BN.prototype.egcd = function egcd(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var x = this;
  var y = p.clone();

  if (x.sign)
    x = x.mod(p);
  else
    x = x.clone();

  // A * x + B * y = x
  var A = new BN(1);
  var B = new BN(0);

  // C * x + D * y = y
  var C = new BN(0);
  var D = new BN(1);

  var g = 0;

  while (x.isEven() && y.isEven()) {
    x.ishrn(1);
    y.ishrn(1);
    ++g;
  }

  var yp = y.clone();
  var xp = x.clone();

  while (x.cmpn(0) !== 0) {
    while (x.isEven()) {
      x.ishrn(1);
      if (A.isEven() && B.isEven()) {
        A.ishrn(1);
        B.ishrn(1);
      } else {
        A.iadd(yp).ishrn(1);
        B.isub(xp).ishrn(1);
      }
    }

    while (y.isEven()) {
      y.ishrn(1);
      if (C.isEven() && D.isEven()) {
        C.ishrn(1);
        D.ishrn(1);
      } else {
        C.iadd(yp).ishrn(1);
        D.isub(xp).ishrn(1);
      }
    }

    if (x.cmp(y) >= 0) {
      x.isub(y);
      A.isub(C);
      B.isub(D);
    } else {
      y.isub(x);
      C.isub(A);
      D.isub(B);
    }
  }

  return {
    a: C,
    b: D,
    gcd: y.ishln(g)
  };
};

// This is reduced incarnation of the binary EEA
// above, designated to invert members of the
// _prime_ fields F(p) at a maximal speed
BN.prototype._invmp = function _invmp(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var a = this;
  var b = p.clone();

  if (a.sign)
    a = a.mod(p);
  else
    a = a.clone();

  var x1 = new BN(1);
  var x2 = new BN(0);

  var delta = b.clone();

  while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
    while (a.isEven()) {
      a.ishrn(1);
      if (x1.isEven())
        x1.ishrn(1);
      else
        x1.iadd(delta).ishrn(1);
    }
    while (b.isEven()) {
      b.ishrn(1);
      if (x2.isEven())
        x2.ishrn(1);
      else
        x2.iadd(delta).ishrn(1);
    }
    if (a.cmp(b) >= 0) {
      a.isub(b);
      x1.isub(x2);
    } else {
      b.isub(a);
      x2.isub(x1);
    }
  }
  if (a.cmpn(1) === 0)
    return x1;
  else
    return x2;
};

BN.prototype.gcd = function gcd(num) {
  if (this.cmpn(0) === 0)
    return num.clone();
  if (num.cmpn(0) === 0)
    return this.clone();

  var a = this.clone();
  var b = num.clone();
  a.sign = false;
  b.sign = false;

  // Remove common factor of two
  for (var shift = 0; a.isEven() && b.isEven(); shift++) {
    a.ishrn(1);
    b.ishrn(1);
  }

  do {
    while (a.isEven())
      a.ishrn(1);
    while (b.isEven())
      b.ishrn(1);

    var r = a.cmp(b);
    if (r < 0) {
      // Swap `a` and `b` to make `a` always bigger than `b`
      var t = a;
      a = b;
      b = t;
    } else if (r === 0 || b.cmpn(1) === 0) {
      break;
    }

    a.isub(b);
  } while (true);

  return b.ishln(shift);
};

// Invert number in the field F(num)
BN.prototype.invm = function invm(num) {
  return this.egcd(num).a.mod(num);
};

BN.prototype.isEven = function isEven() {
  return (this.words[0] & 1) === 0;
};

BN.prototype.isOdd = function isOdd() {
  return (this.words[0] & 1) === 1;
};

// And first word and num
BN.prototype.andln = function andln(num) {
  return this.words[0] & num;
};

// Increment at the bit position in-line
BN.prototype.bincn = function bincn(bit) {
  assert(typeof bit === 'number');
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    for (var i = this.length; i < s + 1; i++)
      this.words[i] = 0;
    this.words[s] |= q;
    this.length = s + 1;
    return this;
  }

  // Add bit and propagate, if needed
  var carry = q;
  for (var i = s; carry !== 0 && i < this.length; i++) {
    var w = this.words[i];
    w += carry;
    carry = w >>> 26;
    w &= 0x3ffffff;
    this.words[i] = w;
  }
  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }
  return this;
};

BN.prototype.cmpn = function cmpn(num) {
  var sign = num < 0;
  if (sign)
    num = -num;

  if (this.sign && !sign)
    return -1;
  else if (!this.sign && sign)
    return 1;

  num &= 0x3ffffff;
  this.strip();

  var res;
  if (this.length > 1) {
    res = 1;
  } else {
    var w = this.words[0];
    res = w === num ? 0 : w < num ? -1 : 1;
  }
  if (this.sign)
    res = -res;
  return res;
};

// Compare two numbers and return:
// 1 - if `this` > `num`
// 0 - if `this` == `num`
// -1 - if `this` < `num`
BN.prototype.cmp = function cmp(num) {
  if (this.sign && !num.sign)
    return -1;
  else if (!this.sign && num.sign)
    return 1;

  var res = this.ucmp(num);
  if (this.sign)
    return -res;
  else
    return res;
};

// Unsigned comparison
BN.prototype.ucmp = function ucmp(num) {
  // At this point both numbers have the same sign
  if (this.length > num.length)
    return 1;
  else if (this.length < num.length)
    return -1;

  var res = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var a = this.words[i];
    var b = num.words[i];

    if (a === b)
      continue;
    if (a < b)
      res = -1;
    else if (a > b)
      res = 1;
    break;
  }
  return res;
};

//
// A reduce context, could be using montgomery or something better, depending
// on the `m` itself.
//
BN.red = function red(num) {
  return new Red(num);
};

BN.prototype.toRed = function toRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  assert(!this.sign, 'red works only with positives');
  return ctx.convertTo(this)._forceRed(ctx);
};

BN.prototype.fromRed = function fromRed() {
  assert(this.red, 'fromRed works only with numbers in reduction context');
  return this.red.convertFrom(this);
};

BN.prototype._forceRed = function _forceRed(ctx) {
  this.red = ctx;
  return this;
};

BN.prototype.forceRed = function forceRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  return this._forceRed(ctx);
};

BN.prototype.redAdd = function redAdd(num) {
  assert(this.red, 'redAdd works only with red numbers');
  return this.red.add(this, num);
};

BN.prototype.redIAdd = function redIAdd(num) {
  assert(this.red, 'redIAdd works only with red numbers');
  return this.red.iadd(this, num);
};

BN.prototype.redSub = function redSub(num) {
  assert(this.red, 'redSub works only with red numbers');
  return this.red.sub(this, num);
};

BN.prototype.redISub = function redISub(num) {
  assert(this.red, 'redISub works only with red numbers');
  return this.red.isub(this, num);
};

BN.prototype.redShl = function redShl(num) {
  assert(this.red, 'redShl works only with red numbers');
  return this.red.shl(this, num);
};

BN.prototype.redMul = function redMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.mul(this, num);
};

BN.prototype.redIMul = function redIMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.imul(this, num);
};

BN.prototype.redSqr = function redSqr() {
  assert(this.red, 'redSqr works only with red numbers');
  this.red._verify1(this);
  return this.red.sqr(this);
};

BN.prototype.redISqr = function redISqr() {
  assert(this.red, 'redISqr works only with red numbers');
  this.red._verify1(this);
  return this.red.isqr(this);
};

// Square root over p
BN.prototype.redSqrt = function redSqrt() {
  assert(this.red, 'redSqrt works only with red numbers');
  this.red._verify1(this);
  return this.red.sqrt(this);
};

BN.prototype.redInvm = function redInvm() {
  assert(this.red, 'redInvm works only with red numbers');
  this.red._verify1(this);
  return this.red.invm(this);
};

// Return negative clone of `this` % `red modulo`
BN.prototype.redNeg = function redNeg() {
  assert(this.red, 'redNeg works only with red numbers');
  this.red._verify1(this);
  return this.red.neg(this);
};

BN.prototype.redPow = function redPow(num) {
  assert(this.red && !num.red, 'redPow(normalNum)');
  this.red._verify1(this);
  return this.red.pow(this, num);
};

// Prime numbers with efficient reduction
var primes = {
  k256: null,
  p224: null,
  p192: null,
  p25519: null
};

// Pseudo-Mersenne prime
function MPrime(name, p) {
  // P = 2 ^ N - K
  this.name = name;
  this.p = new BN(p, 16);
  this.n = this.p.bitLength();
  this.k = new BN(1).ishln(this.n).isub(this.p);

  this.tmp = this._tmp();
}

MPrime.prototype._tmp = function _tmp() {
  var tmp = new BN(null);
  tmp.words = new Array(Math.ceil(this.n / 13));
  return tmp;
};

MPrime.prototype.ireduce = function ireduce(num) {
  // Assumes that `num` is less than `P^2`
  // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
  var r = num;
  var rlen;

  do {
    this.split(r, this.tmp);
    r = this.imulK(r);
    r = r.iadd(this.tmp);
    rlen = r.bitLength();
  } while (rlen > this.n);

  var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
  if (cmp === 0) {
    r.words[0] = 0;
    r.length = 1;
  } else if (cmp > 0) {
    r.isub(this.p);
  } else {
    r.strip();
  }

  return r;
};

MPrime.prototype.split = function split(input, out) {
  input.ishrn(this.n, 0, out);
};

MPrime.prototype.imulK = function imulK(num) {
  return num.imul(this.k);
};

function K256() {
  MPrime.call(
    this,
    'k256',
    'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
}
inherits(K256, MPrime);

K256.prototype.split = function split(input, output) {
  // 256 = 9 * 26 + 22
  var mask = 0x3fffff;

  var outLen = Math.min(input.length, 9);
  for (var i = 0; i < outLen; i++)
    output.words[i] = input.words[i];
  output.length = outLen;

  if (input.length <= 9) {
    input.words[0] = 0;
    input.length = 1;
    return;
  }

  // Shift by 9 limbs
  var prev = input.words[9];
  output.words[output.length++] = prev & mask;

  for (var i = 10; i < input.length; i++) {
    var next = input.words[i];
    input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
    prev = next;
  }
  input.words[i - 10] = prev >>> 22;
  input.length -= 9;
};

K256.prototype.imulK = function imulK(num) {
  // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
  num.words[num.length] = 0;
  num.words[num.length + 1] = 0;
  num.length += 2;

  // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
  var hi;
  var lo = 0;
  for (var i = 0; i < num.length; i++) {
    var w = num.words[i];
    hi = w * 0x40;
    lo += w * 0x3d1;
    hi += (lo / 0x4000000) | 0;
    lo &= 0x3ffffff;

    num.words[i] = lo;

    lo = hi;
  }

  // Fast length reduction
  if (num.words[num.length - 1] === 0) {
    num.length--;
    if (num.words[num.length - 1] === 0)
      num.length--;
  }
  return num;
};

function P224() {
  MPrime.call(
    this,
    'p224',
    'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
}
inherits(P224, MPrime);

function P192() {
  MPrime.call(
    this,
    'p192',
    'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
}
inherits(P192, MPrime);

function P25519() {
  // 2 ^ 255 - 19
  MPrime.call(
    this,
    '25519',
    '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
}
inherits(P25519, MPrime);

P25519.prototype.imulK = function imulK(num) {
  // K = 0x13
  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var hi = num.words[i] * 0x13 + carry;
    var lo = hi & 0x3ffffff;
    hi >>>= 26;

    num.words[i] = lo;
    carry = hi;
  }
  if (carry !== 0)
    num.words[num.length++] = carry;
  return num;
};

// Exported mostly for testing purposes, use plain name instead
BN._prime = function prime(name) {
  // Cached version of prime
  if (primes[name])
    return primes[name];

  var prime;
  if (name === 'k256')
    prime = new K256();
  else if (name === 'p224')
    prime = new P224();
  else if (name === 'p192')
    prime = new P192();
  else if (name === 'p25519')
    prime = new P25519();
  else
    throw new Error('Unknown prime ' + name);
  primes[name] = prime;

  return prime;
};

//
// Base reduction engine
//
function Red(m) {
  if (typeof m === 'string') {
    var prime = BN._prime(m);
    this.m = prime.p;
    this.prime = prime;
  } else {
    this.m = m;
    this.prime = null;
  }
}

Red.prototype._verify1 = function _verify1(a) {
  assert(!a.sign, 'red works only with positives');
  assert(a.red, 'red works only with red numbers');
};

Red.prototype._verify2 = function _verify2(a, b) {
  assert(!a.sign && !b.sign, 'red works only with positives');
  assert(a.red && a.red === b.red,
         'red works only with red numbers');
};

Red.prototype.imod = function imod(a) {
  if (this.prime)
    return this.prime.ireduce(a)._forceRed(this);
  return a.mod(this.m)._forceRed(this);
};

Red.prototype.neg = function neg(a) {
  var r = a.clone();
  r.sign = !r.sign;
  return r.iadd(this.m)._forceRed(this);
};

Red.prototype.add = function add(a, b) {
  this._verify2(a, b);

  var res = a.add(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res._forceRed(this);
};

Red.prototype.iadd = function iadd(a, b) {
  this._verify2(a, b);

  var res = a.iadd(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res;
};

Red.prototype.sub = function sub(a, b) {
  this._verify2(a, b);

  var res = a.sub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res._forceRed(this);
};

Red.prototype.isub = function isub(a, b) {
  this._verify2(a, b);

  var res = a.isub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res;
};

Red.prototype.shl = function shl(a, num) {
  this._verify1(a);
  return this.imod(a.shln(num));
};

Red.prototype.imul = function imul(a, b) {
  this._verify2(a, b);
  return this.imod(a.imul(b));
};

Red.prototype.mul = function mul(a, b) {
  this._verify2(a, b);
  return this.imod(a.mul(b));
};

Red.prototype.isqr = function isqr(a) {
  return this.imul(a, a);
};

Red.prototype.sqr = function sqr(a) {
  return this.mul(a, a);
};

Red.prototype.sqrt = function sqrt(a) {
  if (a.cmpn(0) === 0)
    return a.clone();

  var mod3 = this.m.andln(3);
  assert(mod3 % 2 === 1);

  // Fast case
  if (mod3 === 3) {
    var pow = this.m.add(new BN(1)).ishrn(2);
    var r = this.pow(a, pow);
    return r;
  }

  // Tonelli-Shanks algorithm (Totally unoptimized and slow)
  //
  // Find Q and S, that Q * 2 ^ S = (P - 1)
  var q = this.m.subn(1);
  var s = 0;
  while (q.cmpn(0) !== 0 && q.andln(1) === 0) {
    s++;
    q.ishrn(1);
  }
  assert(q.cmpn(0) !== 0);

  var one = new BN(1).toRed(this);
  var nOne = one.redNeg();

  // Find quadratic non-residue
  // NOTE: Max is such because of generalized Riemann hypothesis.
  var lpow = this.m.subn(1).ishrn(1);
  var z = this.m.bitLength();
  z = new BN(2 * z * z).toRed(this);
  while (this.pow(z, lpow).cmp(nOne) !== 0)
    z.redIAdd(nOne);

  var c = this.pow(z, q);
  var r = this.pow(a, q.addn(1).ishrn(1));
  var t = this.pow(a, q);
  var m = s;
  while (t.cmp(one) !== 0) {
    var tmp = t;
    for (var i = 0; tmp.cmp(one) !== 0; i++)
      tmp = tmp.redSqr();
    assert(i < m);
    var b = this.pow(c, new BN(1).ishln(m - i - 1));

    r = r.redMul(b);
    c = b.redSqr();
    t = t.redMul(c);
    m = i;
  }

  return r;
};

Red.prototype.invm = function invm(a) {
  var inv = a._invmp(this.m);
  if (inv.sign) {
    inv.sign = false;
    return this.imod(inv).redNeg();
  } else {
    return this.imod(inv);
  }
};

Red.prototype.pow = function pow(a, num) {
  var w = [];

  if (num.cmpn(0) === 0)
    return new BN(1);

  var q = num.clone();

  while (q.cmpn(0) !== 0) {
    w.push(q.andln(1));
    q.ishrn(1);
  }

  // Skip leading zeroes
  var res = a;
  for (var i = 0; i < w.length; i++, res = this.sqr(res))
    if (w[i] !== 0)
      break;

  if (++i < w.length) {
    for (var q = this.sqr(res); i < w.length; i++, q = this.sqr(q)) {
      if (w[i] === 0)
        continue;
      res = this.mul(res, q);
    }
  }

  return res;
};

Red.prototype.convertTo = function convertTo(num) {
  var r = num.mod(this.m);
  if (r === num)
    return r.clone();
  else
    return r;
};

Red.prototype.convertFrom = function convertFrom(num) {
  var res = num.clone();
  res.red = null;
  return res;
};

//
// Montgomery method engine
//

BN.mont = function mont(num) {
  return new Mont(num);
};

function Mont(m) {
  Red.call(this, m);

  this.shift = this.m.bitLength();
  if (this.shift % 26 !== 0)
    this.shift += 26 - (this.shift % 26);
  this.r = new BN(1).ishln(this.shift);
  this.r2 = this.imod(this.r.sqr());
  this.rinv = this.r._invmp(this.m);

  this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
  this.minv.sign = true;
  this.minv = this.minv.mod(this.r);
}
inherits(Mont, Red);

Mont.prototype.convertTo = function convertTo(num) {
  return this.imod(num.shln(this.shift));
};

Mont.prototype.convertFrom = function convertFrom(num) {
  var r = this.imod(num.mul(this.rinv));
  r.red = null;
  return r;
};

Mont.prototype.imul = function imul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0) {
    a.words[0] = 0;
    a.length = 1;
    return a;
  }

  var t = a.imul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.mul = function mul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0)
    return new BN(0)._forceRed(this);

  var t = a.mul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.invm = function invm(a) {
  // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
  var res = this.imod(a._invmp(this.m).mul(this.r2));
  return res._forceRed(this);
};

})(typeof module === 'undefined' || module, this);

},{}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/constants/der.js":[function(require,module,exports){
var constants = require('../constants');

exports.tagClass = {
  0: 'universal',
  1: 'application',
  2: 'context',
  3: 'private'
};
exports.tagClassByName = constants._reverse(exports.tagClass);

exports.tag = {
  0x00: 'end',
  0x01: 'bool',
  0x02: 'int',
  0x03: 'bitstr',
  0x04: 'octstr',
  0x05: 'null_',
  0x06: 'objid',
  0x07: 'objDesc',
  0x08: 'external',
  0x09: 'real',
  0x0a: 'enum',
  0x0b: 'embed',
  0x0c: 'utf8str',
  0x0d: 'relativeOid',
  0x10: 'seq',
  0x11: 'set',
  0x12: 'numstr',
  0x13: 'printstr',
  0x14: 't61str',
  0x15: 'videostr',
  0x16: 'ia5str',
  0x17: 'utctime',
  0x18: 'gentime',
  0x19: 'graphstr',
  0x1a: 'iso646str',
  0x1b: 'genstr',
  0x1c: 'unistr',
  0x1d: 'charstr',
  0x1e: 'bmpstr'
};
exports.tagByName = constants._reverse(exports.tag);

},{"../constants":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/constants/index.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/constants/index.js":[function(require,module,exports){
var constants = exports;

// Helper
constants._reverse = function reverse(map) {
  var res = {};

  Object.keys(map).forEach(function(key) {
    // Convert key to integer if it is stringified
    if ((key | 0) == key)
      key = key | 0;

    var value = map[key];
    res[value] = key;
  });

  return res;
};

constants.der = require('./der');

},{"./der":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/constants/der.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js":[function(require,module,exports){
var inherits = require('util').inherits;

var asn1 = require('../asn1');
var base = asn1.base;
var bignum = asn1.bignum;

// Import DER constants
var der = asn1.constants.der;

function DERDecoder(entity) {
  this.enc = 'der';
  this.name = entity.name;
  this.entity = entity;

  // Construct base tree
  this.tree = new DERNode();
  this.tree._init(entity.body);
};
module.exports = DERDecoder;

DERDecoder.prototype.decode = function decode(data, options) {
  if (!(data instanceof base.DecoderBuffer))
    data = new base.DecoderBuffer(data, options);

  return this.tree._decode(data, options);
};

// Tree methods

function DERNode(parent) {
  base.Node.call(this, 'der', parent);
}
inherits(DERNode, base.Node);

DERNode.prototype._peekTag = function peekTag(buffer, tag, any) {
  if (buffer.isEmpty())
    return false;

  var state = buffer.save();
  var decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
  if (buffer.isError(decodedTag))
    return decodedTag;

  buffer.restore(state);

  return decodedTag.tag === tag || decodedTag.tagStr === tag || any;
};

DERNode.prototype._decodeTag = function decodeTag(buffer, tag, any) {
  var decodedTag = derDecodeTag(buffer,
                                'Failed to decode tag of "' + tag + '"');
  if (buffer.isError(decodedTag))
    return decodedTag;

  var len = derDecodeLen(buffer,
                         decodedTag.primitive,
                         'Failed to get length of "' + tag + '"');

  // Failure
  if (buffer.isError(len))
    return len;

  if (!any &&
      decodedTag.tag !== tag &&
      decodedTag.tagStr !== tag &&
      decodedTag.tagStr + 'of' !== tag) {
    return buffer.error('Failed to match tag: "' + tag + '"');
  }

  if (decodedTag.primitive || len !== null)
    return buffer.skip(len, 'Failed to match body of: "' + tag + '"');

  // Indefinite length... find END tag
  var state = buffer.save();
  var res = this._skipUntilEnd(
      buffer,
      'Failed to skip indefinite length body: "' + this.tag + '"');
  if (buffer.isError(res))
    return res;

  len = buffer.offset - state.offset;
  buffer.restore(state);
  return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
};

DERNode.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
  while (true) {
    var tag = derDecodeTag(buffer, fail);
    if (buffer.isError(tag))
      return tag;
    var len = derDecodeLen(buffer, tag.primitive, fail);
    if (buffer.isError(len))
      return len;

    var res;
    if (tag.primitive || len !== null)
      res = buffer.skip(len)
    else
      res = this._skipUntilEnd(buffer, fail);

    // Failure
    if (buffer.isError(res))
      return res;

    if (tag.tagStr === 'end')
      break;
  }
};

DERNode.prototype._decodeList = function decodeList(buffer, tag, decoder) {
  var result = [];
  while (!buffer.isEmpty()) {
    var possibleEnd = this._peekTag(buffer, 'end');
    if (buffer.isError(possibleEnd))
      return possibleEnd;

    var res = decoder.decode(buffer, 'der');
    if (buffer.isError(res) && possibleEnd)
      break;
    result.push(res);
  }
  return result;
};

DERNode.prototype._decodeStr = function decodeStr(buffer, tag) {
  if (tag === 'octstr') {
    return buffer.raw();
  } else if (tag === 'bitstr') {
    var unused = buffer.readUInt8();
    if (buffer.isError(unused))
      return unused;

    return { unused: unused, data: buffer.raw() };
  } else if (tag === 'ia5str' || tag === 'utf8str') {
    return buffer.raw().toString();
  } else {
    return this.error('Decoding of string type: ' + tag + ' unsupported');
  }
};

DERNode.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
  var identifiers = [];
  var ident = 0;
  while (!buffer.isEmpty()) {
    var subident = buffer.readUInt8();
    ident <<= 7;
    ident |= subident & 0x7f;
    if ((subident & 0x80) === 0) {
      identifiers.push(ident);
      ident = 0;
    }
  }
  if (subident & 0x80)
    identifiers.push(ident);

  var first = (identifiers[0] / 40) | 0;
  var second = identifiers[0] % 40;

  if (relative)
    result = identifiers;
  else
    result = [first, second].concat(identifiers.slice(1));

  if (values)
    result = values[result.join(' ')];

  return result;
};

DERNode.prototype._decodeTime = function decodeTime(buffer, tag) {
  var str = buffer.raw().toString();
  if (tag === 'gentime') {
    var year = str.slice(0, 4) | 0;
    var mon = str.slice(4, 6) | 0;
    var day = str.slice(6, 8) | 0;
    var hour = str.slice(8, 10) | 0;
    var min = str.slice(10, 12) | 0;
    var sec = str.slice(12, 14) | 0;
  } else if (tag === 'utctime') {
    var year = str.slice(0, 2) | 0;
    var mon = str.slice(2, 4) | 0;
    var day = str.slice(4, 6) | 0;
    var hour = str.slice(6, 8) | 0;
    var min = str.slice(8, 10) | 0;
    var sec = str.slice(10, 12) | 0;
    if (year < 70)
      year = 2000 + year;
    else
      year = 1900 + year;
  } else {
    return this.error('Decoding ' + tag + ' time is not supported yet');
  }

  return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
};

DERNode.prototype._decodeNull = function decodeNull(buffer) {
  return null;
};

DERNode.prototype._decodeBool = function decodeBool(buffer) {
  var res = buffer.readUInt8();
  if (buffer.isError(res))
    return res;
  else
    return res !== 0;
};

DERNode.prototype._decodeInt = function decodeInt(buffer, values) {
  // Bigint, return as it is (assume big endian)
  var raw = buffer.raw();
  var res = new bignum(raw);

  if (values)
    res = values[res.toString(10)] || res;

  return res;
};

DERNode.prototype._use = function use(entity, obj) {
  if (typeof entity === 'function')
    entity = entity(obj);
  return entity._getDecoder('der').tree;
};

// Utility methods

function derDecodeTag(buf, fail) {
  var tag = buf.readUInt8(fail);
  if (buf.isError(tag))
    return tag;

  var cls = der.tagClass[tag >> 6];
  var primitive = (tag & 0x20) === 0;

  // Multi-octet tag - load
  if ((tag & 0x1f) === 0x1f) {
    var oct = tag;
    tag = 0;
    while ((oct & 0x80) === 0x80) {
      oct = buf.readUInt8(fail);
      if (buf.isError(oct))
        return oct;

      tag <<= 7;
      tag |= oct & 0x7f;
    }
  } else {
    tag &= 0x1f;
  }
  var tagStr = der.tag[tag];

  return {
    cls: cls,
    primitive: primitive,
    tag: tag,
    tagStr: tagStr
  };
}

function derDecodeLen(buf, primitive, fail) {
  var len = buf.readUInt8(fail);
  if (buf.isError(len))
    return len;

  // Indefinite form
  if (!primitive && len === 0x80)
    return null;

  // Definite form
  if ((len & 0x80) === 0) {
    // Short form
    return len;
  }

  // Long form
  var num = len & 0x7f;
  if (num >= 4)
    return buf.error('length octect is too long');

  len = 0;
  for (var i = 0; i < num; i++) {
    len <<= 8;
    var j = buf.readUInt8(fail);
    if (buf.isError(j))
      return j;
    len |= j;
  }

  return len;
}

},{"../asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/index.js":[function(require,module,exports){
var decoders = exports;

decoders.der = require('./der');
decoders.pem = require('./pem');

},{"./der":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js","./pem":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/pem.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/pem.js":[function(require,module,exports){
const inherits = require('util').inherits;

const asn1 = require('../asn1');
const DERDecoder = require('./der');

function PEMDecoder(entity) {
    DERDecoder.call(this, entity);
    this.enc = 'pem';
};
inherits(PEMDecoder, DERDecoder);
module.exports = PEMDecoder;

PEMDecoder.prototype.decode = function decode(data, options) {
    const lines = data.toString().split(/[\r\n]+/g);

    const label = options.label.toUpperCase();

    const re = /^-----(BEGIN|END) ([^-]+)-----$/;
    let start = -1;
    let end = -1;
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(re);
        if (match === null)
            continue;

        if (match[2] !== label)
            continue;

        if (start === -1) {
            if (match[1] !== 'BEGIN')
                break;
            start = i;
        } else {
            if (match[1] !== 'END')
                break;
            end = i;
            break;
        }
    }
    if (start === -1 || end === -1)
        throw new Error('PEM section not found for: ' + label);

    const base64 = lines.slice(start + 1, end).join('');
    // Remove excessive symbols
    base64.replace(/[^a-z0-9\+\/=]+/gi, '');
    const input = $$.Buffer.from(base64, 'base64');
    return DERDecoder.prototype.decode.call(this, input, options);
};

},{"../asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./der":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/decoders/der.js","util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js":[function(require,module,exports){
const inherits = require('util').inherits;
const asn1 = require('../asn1');
const base = asn1.base;
const bignum = asn1.bignum;

// Import DER constants
const der = asn1.constants.der;

function DEREncoder(entity) {
    this.enc = 'der';
    this.name = entity.name;
    this.entity = entity;

    // Construct base tree
    this.tree = new DERNode();
    this.tree._init(entity.body);
}
module.exports = DEREncoder;

DEREncoder.prototype.encode = function encode(data, reporter) {
    return this.tree._encode(data, reporter).join();
};

// Tree methods

function DERNode(parent) {
    base.Node.call(this, 'der', parent);
}

inherits(DERNode, base.Node);

DERNode.prototype._encodeComposite = function encodeComposite(tag, primitive, cls, content) {
    const encodedTag = encodeTag(tag, primitive, cls, this.reporter);

    // Short form
    if (content.length < 0x80) {
        const header = $$.Buffer.alloc(2);
        header[0] = encodedTag;
        header[1] = content.length;
        return this._createEncoderBuffer([header, content]);
    }

    // Long form
    // Count octets required to store length
    let lenOctets = 1;
    for (let i = content.length; i >= 0x100; i >>= 8)
        lenOctets++;

    const header = $$.Buffer.alloc(1 + 1 + lenOctets);
    header[0] = encodedTag;
    header[1] = 0x80 | lenOctets;

    for (let i = 1 + lenOctets, j = content.length; j > 0; i--, j >>= 8)
        header[i] = j & 0xff;

    return this._createEncoderBuffer([header, content]);
};

DERNode.prototype._encodeStr = function encodeStr(str, tag) {
    if (tag === 'octstr')
        return this._createEncoderBuffer(str);
    else if (tag === 'bitstr')
        return this._createEncoderBuffer([str.unused | 0, str.data]);
    else if (tag === 'ia5str' || tag === 'utf8str')
        return this._createEncoderBuffer(str);
    return this.reporter.error('Encoding of string type: ' + tag +
        ' unsupported');
};

DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
    if (typeof id === 'string') {
        if (!values)
            return this.reporter.error('string objid given, but no values map found');
        if (!values.hasOwnProperty(id))
            return this.reporter.error('objid not found in values map');
        id = values[id].split(/[\s\.]+/g);
        for (let i = 0; i < id.length; i++)
            id[i] |= 0;
    } else if (Array.isArray(id)) {
        id = id.slice();
        for (let i = 0; i < id.length; i++)
            id[i] |= 0;
    }

    if (!Array.isArray(id)) {
        return this.reporter.error('objid() should be either array or string, ' +
            'got: ' + JSON.stringify(id));
    }

    if (!relative) {
        if (id[1] >= 40)
            return this.reporter.error('Second objid identifier OOB');
        id.splice(0, 2, id[0] * 40 + id[1]);
    }

    // Count number of octets
    let size = 0;
    for (let i = 0; i < id.length; i++) {
        let ident = id[i];
        for (size++; ident >= 0x80; ident >>= 7)
            size++;
    }

    const objid = $$.Buffer.alloc(size);
    let offset = objid.length - 1;
    for (let i = id.length - 1; i >= 0; i--) {
        let ident = id[i];
        objid[offset--] = ident & 0x7f;
        while ((ident >>= 7) > 0)
            objid[offset--] = 0x80 | (ident & 0x7f);
    }

    return this._createEncoderBuffer(objid);
};

function two(num) {
    if (num < 10)
        return '0' + num;
    else
        return num;
}

DERNode.prototype._encodeTime = function encodeTime(time, tag) {
    let str;
    const date = new Date(time);

    if (tag === 'gentime') {
        str = [
            two(date.getFullYear()),
            two(date.getUTCMonth() + 1),
            two(date.getUTCDate()),
            two(date.getUTCHours()),
            two(date.getUTCMinutes()),
            two(date.getUTCSeconds()),
            'Z'
        ].join('');
    } else if (tag === 'utctime') {
        str = [
            two(date.getFullYear() % 100),
            two(date.getUTCMonth() + 1),
            two(date.getUTCDate()),
            two(date.getUTCHours()),
            two(date.getUTCMinutes()),
            two(date.getUTCSeconds()),
            'Z'
        ].join('');
    } else {
        this.reporter.error('Encoding ' + tag + ' time is not supported yet');
    }

    return this._encodeStr(str, 'octstr');
};

DERNode.prototype._encodeNull = function encodeNull() {
    return this._createEncoderBuffer('');
};

DERNode.prototype._encodeInt = function encodeInt(num, values) {
    if (typeof num === 'string') {
        if (!values)
            return this.reporter.error('String int or enum given, but no values map');
        if (!values.hasOwnProperty(num)) {
            return this.reporter.error('Values map doesn\'t contain: ' +
                JSON.stringify(num));
        }
        num = values[num];
    }

    // Bignum, assume big endian
    if (typeof num !== 'number' && !$$.Buffer.isBuffer(num)) {
        const numArray = num.toArray();
        if (num.sign === false && numArray[0] & 0x80) {
            numArray.unshift(0);
        }
        num = $$.Buffer.from(numArray);
    }

    if ($$.Buffer.isBuffer(num)) {
        let size = num.length;
        if (num.length === 0)
            size++;

        const out = $$.Buffer.alloc(size);
        num.copy(out);
        if (num.length === 0)
            out[0] = 0
        return this._createEncoderBuffer(out);
    }

    if (num < 0x80)
        return this._createEncoderBuffer(num);

    if (num < 0x100)
        return this._createEncoderBuffer([0, num]);

    let size = 1;
    for (let i = num; i >= 0x100; i >>= 8)
        size++;

    const out = new Array(size);
    for (let i = out.length - 1; i >= 0; i--) {
        out[i] = num & 0xff;
        num >>= 8;
    }
    if (out[0] & 0x80) {
        out.unshift(0);
    }

    return this._createEncoderBuffer($$.Buffer.from(out));
};

DERNode.prototype._encodeBool = function encodeBool(value) {
    return this._createEncoderBuffer(value ? 0xff : 0);
};

DERNode.prototype._use = function use(entity, obj) {
    if (typeof entity === 'function')
        entity = entity(obj);
    return entity._getEncoder('der').tree;
};

DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
    const state = this._baseState;
    let i;
    if (state['default'] === null)
        return false;

    const data = dataBuffer.join();
    if (state.defaultBuffer === undefined)
        state.defaultBuffer = this._encodeValue(state['default'], reporter, parent).join();

    if (data.length !== state.defaultBuffer.length)
        return false;

    for (i = 0; i < data.length; i++)
        if (data[i] !== state.defaultBuffer[i])
            return false;

    return true;
};

// Utility methods

function encodeTag(tag, primitive, cls, reporter) {
    let res;

    if (tag === 'seqof')
        tag = 'seq';
    else if (tag === 'setof')
        tag = 'set';

    if (der.tagByName.hasOwnProperty(tag))
        res = der.tagByName[tag];
    else if (typeof tag === 'number' && (tag | 0) === tag)
        res = tag;
    else
        return reporter.error('Unknown tag: ' + tag);

    if (res >= 0x1f)
        return reporter.error('Multi-octet tag encoding unsupported');

    if (!primitive)
        res |= 0x20;

    res |= (der.tagClassByName[cls || 'universal'] << 6);

    return res;
}

},{"../asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/index.js":[function(require,module,exports){
var encoders = exports;

encoders.der = require('./der');
encoders.pem = require('./pem');

},{"./der":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js","./pem":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/pem.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/pem.js":[function(require,module,exports){
var inherits = require('util').inherits;

var asn1 = require('../asn1');
var DEREncoder = require('./der');

function PEMEncoder(entity) {
  DEREncoder.call(this, entity);
  this.enc = 'pem';
};
inherits(PEMEncoder, DEREncoder);
module.exports = PEMEncoder;

PEMEncoder.prototype.encode = function encode(data, options) {
  var buf = DEREncoder.prototype.encode.call(this, data);

  var p = buf.toString('base64');
  var out = [ '-----BEGIN ' + options.label + '-----' ];
  for (var i = 0; i < p.length; i += 64)
    out.push(p.slice(i, i + 64));
  out.push('-----END ' + options.label + '-----');
  return out.join('\n');
};

},{"../asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./der":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/encoders/der.js","util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/keyEncoder.js":[function(require,module,exports){
'use strict'

const asn1 = require('./asn1/asn1');
const BN = require('./asn1/bignum/bn');

const ECPrivateKeyASN = asn1.define('ECPrivateKey', function () {
    this.seq().obj(
        this.key('version').int(),
        this.key('privateKey').octstr(),
        this.key('parameters').explicit(0).objid().optional(),
        this.key('publicKey').explicit(1).bitstr().optional()
    )
})

const SubjectPublicKeyInfoASN = asn1.define('SubjectPublicKeyInfo', function () {
    this.seq().obj(
        this.key('algorithm').seq().obj(
            this.key("id").objid(),
            this.key("curve").objid()
        ),
        this.key('pub').bitstr()
    )
})

const curves = {
    secp256k1: {
        curveParameters: [1, 3, 132, 0, 10],
        privatePEMOptions: {label: 'EC PRIVATE KEY'},
        publicPEMOptions: {label: 'PUBLIC KEY'}
    }
}

function assert(val, msg) {
    if (!val) {
        throw new Error(msg || 'Assertion failed')
    }
}

function KeyEncoder(options) {
    if (typeof options === 'string') {
        assert(curves.hasOwnProperty(options), 'Unknown curve ' + options);
        options = curves[options]
    }
    this.options = options;
    this.algorithmID = [1, 2, 840, 10045, 2, 1]
}

KeyEncoder.ECPrivateKeyASN = ECPrivateKeyASN;
KeyEncoder.SubjectPublicKeyInfoASN = SubjectPublicKeyInfoASN;

KeyEncoder.prototype.privateKeyObject = function (rawPrivateKey, rawPublicKey, encodingFormat = "hex") {
    const privateKeyObject = {
        version: new BN(1),
        privateKey: $$.Buffer.from(rawPrivateKey, encodingFormat),
        parameters: this.options.curveParameters,
        pemOptions: {label: "EC PRIVATE KEY"}
    };

    if (rawPublicKey) {
        privateKeyObject.publicKey = {
            unused: 0,
            data: $$.Buffer.from(rawPublicKey, encodingFormat)
        }
    }

    return privateKeyObject
};

KeyEncoder.prototype.publicKeyObject = function (rawPublicKey, encodingFormat = "hex") {
    return {
        algorithm: {
            id: this.algorithmID,
            curve: this.options.curveParameters
        },
        pub: {
            unused: 0,
            data: rawPublicKey
        },
        pemOptions: {label: "PUBLIC KEY"}
    }
}

KeyEncoder.prototype.encodePrivate = function (privateKey, originalFormat, destinationFormat, encodingFormat = "hex") {
    let privateKeyObject;

    /* Parse the incoming private key and convert it to a private key object */
    if (originalFormat === 'raw') {
        if (!$$.Buffer.isBuffer(privateKey)) {
            throw Error('private key must be a buffer');
        }
        let privateKeyObject = this.options.curve.keyFromPrivate(privateKey, encodingFormat),
            rawPublicKey = privateKeyObject.getPublic(encodingFormat)
        privateKeyObject = this.privateKeyObject(privateKey, rawPublicKey)
    } else if (originalFormat === 'der') {
        if ($$.Buffer.isBuffer(privateKey)) {
            // do nothing
        } else if (typeof privateKey === 'string') {
            privateKey = $$.Buffer.from(privateKey, encodingFormat);
        } else {
            throw Error('private key must be a buffer or a string');
        }
        privateKeyObject = ECPrivateKeyASN.decode(privateKey, 'der')
    } else if (originalFormat === 'pem') {
        if (!typeof privateKey === 'string') {
            throw Error('private key must be a string');
        }
        privateKeyObject = ECPrivateKeyASN.decode(privateKey, 'pem', this.options.privatePEMOptions)
    } else {
        throw Error('invalid private key format');
    }

    /* Export the private key object to the desired format */
    if (destinationFormat === 'raw') {
        return privateKeyObject.privateKey;
    } else if (destinationFormat === 'der') {
        return ECPrivateKeyASN.encode(privateKeyObject, 'der').toString(encodingFormat)
    } else if (destinationFormat === 'pem') {
        return ECPrivateKeyASN.encode(privateKeyObject, 'pem', this.options.privatePEMOptions)
    } else {
        throw Error('invalid destination format for private key');
    }
}

KeyEncoder.prototype.encodePublic = function (publicKey, originalFormat, destinationFormat, encodingFormat = "hex") {
    let publicKeyObject;

    /* Parse the incoming public key and convert it to a public key object */
    if (originalFormat === 'raw') {
        if (!$$.Buffer.isBuffer(publicKey)) {
            throw Error('public key must be a buffer');
        }
        publicKeyObject = this.publicKeyObject(publicKey)
    } else if (originalFormat === 'der') {
        if ($$.Buffer.isBuffer(publicKey)) {
            // do nothing
        } else if (typeof publicKey === 'string') {
            publicKey = $$.Buffer.from(publicKey, encodingFormat)
        } else {
            throw Error('public key must be a buffer or a string');
        }
        publicKeyObject = SubjectPublicKeyInfoASN.decode(publicKey, 'der')
    } else if (originalFormat === 'pem') {
        if (!(typeof publicKey === 'string')) {
            throw Error('public key must be a string');
        }
        publicKeyObject = SubjectPublicKeyInfoASN.decode(publicKey, 'pem', this.options.publicPEMOptions)
    } else {
        throw Error('invalid public key format');
    }

    /* Export the private key object to the desired format */
    if (destinationFormat === 'raw') {
        return publicKeyObject.pub.data;
    } else if (destinationFormat === 'der') {
        return SubjectPublicKeyInfoASN.encode(publicKeyObject, 'der').toString(encodingFormat)
    } else if (destinationFormat === 'pem') {
        return SubjectPublicKeyInfoASN.encode(publicKeyObject, 'pem', this.options.publicPEMOptions)
    } else {
        throw Error('invalid destination format for public key');
    }
}

module.exports = KeyEncoder;

},{"./asn1/asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","./asn1/bignum/bn":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js"}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/DerASN1Decoder.js":[function(require,module,exports){
const asn1 = require('../asn1/asn1');
const BN = require('../asn1/bignum/bn');

const EcdsaDerSig = asn1.define('ECPrivateKey', function() {
    return this.seq().obj(
        this.key('r').int(),
        this.key('s').int()
    );
});

/// helper functions for ethereum signature encoding
function bnToBuffer(bn) {
    return stripZeros($$.Buffer.from(padToEven(bn.toString(16)), 'hex'));
}

function padToEven(str) {
    return str.length % 2 ? '0' + str : str;
}

function stripZeros(buffer) {
    var i = 0; // eslint-disable-line
    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0) {
            break;
        }
    }
    return i > 0 ? buffer.slice(i) : buffer;
}
///

function decodeDERIntoASN1ETH(derSignatureBuffer){
    const rsSig = EcdsaDerSig.decode(derSignatureBuffer, 'der');
    const signArray = [bnToBuffer(rsSig.r),bnToBuffer(rsSig.s)];
    //build signature
    return '0x'+$$.Buffer.concat(signArray).toString('hex');
}

function asn1SigSigToConcatSig(asn1SigBuffer) {
    const rsSig = EcdsaDerSig.decode(asn1SigBuffer, 'der');
    return $$.Buffer.concat([
        rsSig.r.toArrayLike($$.Buffer, 'be', 32),
        rsSig.s.toArrayLike($$.Buffer, 'be', 32)
    ]);
}

function concatSigToAsn1SigSig(concatSigBuffer) {
    const r = new BN(concatSigBuffer.slice(0, 32).toString('hex'), 16, 'be');
    const s = new BN(concatSigBuffer.slice(32).toString('hex'), 16, 'be');
    return EcdsaDerSig.encode({r, s}, 'der');
}

function ecdsaSign(data, key) {
    if (typeof data === "string") {
        data = $$.Buffer.from(data);
    }
    const crypto = require('crypto');
    const sign = crypto.createSign('sha256');
    sign.update(data);
    const asn1SigBuffer = sign.sign(key, 'buffer');
    return asn1SigSigToConcatSig(asn1SigBuffer);
}

/**
 * @return {string}
 */
function EthRSSign(data, key) {
    if (typeof data === "string") {
        data = $$.Buffer.from(data);
    }
    //by default it will create DER encoded signature
    const crypto = require('crypto');
    const sign = crypto.createSign('sha256');
    sign.update(data);
    const derSignatureBuffer = sign.sign(key, 'buffer');
    return decodeDERIntoASN1ETH(derSignatureBuffer);
}

function ecdsaVerify(data, signature, key) {
    const crypto = require('crypto');
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    const asn1sig = concatSigToAsn1SigSig(signature);
    return verify.verify(key, new $$.Buffer(asn1sig, 'hex'));
}

module.exports = {
    decodeDERIntoASN1ETH
};
},{"../asn1/asn1":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/asn1.js","../asn1/bignum/bn":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/asn1/bignum/bn.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js":[function(require,module,exports){
const stream = require('stream');
const util = require('util');

const Duplex = stream.Duplex;

function DuplexStream(options) {
	if (!(this instanceof DuplexStream)) {
		return new DuplexStream(options);
	}
	Duplex.call(this, options);
}
util.inherits(DuplexStream, Duplex);

DuplexStream.prototype._write = function (chunk, enc, cb) {
	this.push(chunk);
	cb();
};


DuplexStream.prototype._read = function (n) {

};

module.exports = DuplexStream;
},{"stream":false,"util":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/base58.js":[function(require,module,exports){
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = ALPHABET.length;
const LEADER = ALPHABET.charAt(0);
const FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
const iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up

const BASE_MAP = $$.Buffer.alloc(256);
for (let j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255
}
for (let i = 0; i < ALPHABET.length; i++) {
    let x = ALPHABET.charAt(i);
    let xc = x.charCodeAt(0);
    if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + ' is ambiguous');
    }
    BASE_MAP[xc] = i;
}

function encode(source) {
    if (Array.isArray(source) || source instanceof Uint8Array || typeof source === "string") {
        source = $$.Buffer.from(source);
    }
    if (!$$.Buffer.isBuffer(source)) {
        throw new TypeError('Expected $$.Buffer');
    }
    if (source.length === 0) {
        return '';
    }
    // Skip & count leading zeroes.
    let zeroes = 0;
    let length = 0;
    let pbegin = 0;
    const pend = source.length;
    while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
    }
    // Allocate enough space in big-endian base58 representation.
    const size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
    const b58 = $$.Buffer.alloc(size);
    // Process the bytes.
    while (pbegin !== pend) {
        let carry = source[pbegin];
        // Apply "b58 = b58 * 256 + ch".
        let i = 0;
        for (let it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
            carry += (256 * b58[it1]) >>> 0;
            b58[it1] = (carry % BASE) >>> 0;
            carry = (carry / BASE) >>> 0;
        }
        if (carry !== 0) {
            throw new Error('Non-zero carry');
        }
        length = i;
        pbegin++;
    }
    // Skip leading zeroes in base58 result.
    let it2 = size - length;
    while (it2 !== size && b58[it2] === 0) {
        it2++;
    }
    // Translate the result into a string.
    let str = LEADER.repeat(zeroes);
    for (; it2 < size; ++it2) {
        str += ALPHABET.charAt(b58[it2]);
    }
    return str;
}

function decode(source) {
    if (typeof source !== 'string') {
        throw new TypeError('Expected String');
    }
    if (source.length === 0) {
        return $$.Buffer.alloc(0);
    }
    let psz = 0;
    // Skip leading spaces.
    if (source[psz] === ' ') {
        return;
    }
    // Skip and count leading '1's.
    let zeroes = 0;
    let length = 0;
    while (source[psz] === LEADER) {
        zeroes++;
        psz++;
    }
    // Allocate enough space in big-endian base256 representation.
    const size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
    const b256 = $$.Buffer.alloc(size);
    // Process the characters.
    while (source[psz]) {
        // Decode character
        let carry = BASE_MAP[source.charCodeAt(psz)];
        // Invalid character
        if (carry === 255) {
            return;
        }
        let i = 0;
        for (let it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
            carry += (BASE * b256[it3]) >>> 0;
            b256[it3] = (carry % 256) >>> 0;
            carry = (carry / 256) >>> 0;
        }
        if (carry !== 0) {
            throw new Error('Non-zero carry');
        }
        length = i;
        psz++;
    }
    // Skip trailing spaces.
    if (source[psz] === ' ') {
        return;
    }
    // Skip leading zeroes in b256.
    let it4 = size - length;
    while (it4 !== size && b256[it4] === 0) {
        it4++;
    }
    const vch = $$.Buffer.alloc(zeroes + (size - it4));
    vch.fill(0x00, 0, zeroes);
    let j = zeroes;
    while (it4 !== size) {
        vch[j++] = b256[it4++];
    }
    return vch;
}

module.exports = {
    encode,
    decode
};
},{}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/cryptoUtils.js":[function(require,module,exports){
const base58 = require('./base58');

const keySizes = [128, 192, 256];
const authenticationModes = ["ocb", "ccm", "gcm"];

function encode(buffer) {
	return buffer.toString('base64')
		.replace(/\+/g, '')
		.replace(/\//g, '')
		.replace(/=+$/, '');
}

function createPskHash(data, encoding) {
	const pskHash = new PskHash();
	pskHash.update(data);
	return pskHash.digest(encoding);
}

function PskHash() {
	const crypto = require('crypto');

	const sha512 = crypto.createHash('sha512');
	const sha256 = crypto.createHash('sha256');

	function update(data) {
		sha512.update(data);
	}

	function digest(encoding) {
		sha256.update(sha512.digest());
		return sha256.digest(encoding);
	}

	return {
		update,
		digest
	}
}


function generateSalt(inputData, saltLen) {
	const crypto = require('crypto');
	const hash = crypto.createHash('sha512');
	hash.update(inputData);
	const digest = $$.Buffer.from(hash.digest('hex'), 'binary');

	return digest.slice(0, saltLen);
}

function encryptionIsAuthenticated(algorithm) {
	for (const mode of authenticationModes) {
		if (algorithm.includes(mode)) {
			return true;
		}
	}

	return false;
}

function getKeyLength(algorithm) {
	for (const len of keySizes) {
		if (algorithm.includes(len.toString())) {
			return len / 8;
		}
	}

	throw new Error("Invalid encryption algorithm.");
}

function base58Encode(data) {
	return base58.encode(data);
}

function base58Decode(data) {
	return base58.decode(data);
}

module.exports = {
	createPskHash,
	encode,
	generateSalt,
	PskHash,
    base58Encode,
    base58Decode,
	getKeyLength,
	encryptionIsAuthenticated
};


},{"./base58":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/base58.js","crypto":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/isStream.js":[function(require,module,exports){
const stream = require('stream');


function isStream (obj) {
	return obj instanceof stream.Stream || obj instanceof stream.Duplex;
}


function isReadable (obj) {
	return isStream(obj) && typeof obj._read === 'function' && typeof obj._readableState === 'object'
}


function isWritable (obj) {
	return isStream(obj) && typeof obj._write === 'function' && typeof obj._writableState === 'object'
}


function isDuplex (obj) {
	return isReadable(obj) && isWritable(obj)
}


module.exports            = isStream;
module.exports.isReadable = isReadable;
module.exports.isWritable = isWritable;
module.exports.isDuplex   = isDuplex;
},{"stream":false}],"/home/runner/work/privatesky/privatesky/modules/pskcrypto/signsensusDS/ssutil.js":[function(require,module,exports){
/*
 SignSens helper functions
 */
exports.wipeOutsidePayload = function wipeOutsidePayload(hashStringHexa, pos, size){
    var result;
    var sz = hashStringHexa.length;

    var end = (pos + size) % sz;

    if(pos < end){
        result = '0'.repeat(pos) +  hashStringHexa.substring(pos, end) + '0'.repeat(sz - end);
    }
    else {
        result = hashStringHexa.substring(0, end) + '0'.repeat(pos - end) + hashStringHexa.substring(pos, sz);
    }
    return result;
}



exports.extractPayload = function extractPayload(hashStringHexa, pos, size){
    var result;

    var sz = hashStringHexa.length;
    var end = (pos + size) % sz;

    if( pos < end){
        result = hashStringHexa.substring(pos, pos + size);
    } else{

        if(0 != end){
            result = hashStringHexa.substring(0, end)
        }  else {
            result = "";
        }
        result += hashStringHexa.substring(pos, sz);
    }
    return result;
}



exports.fillPayload = function fillPayload(payload, pos, size){
    var sz = 64;
    var result = "";

    var end = (pos + size) % sz;

    if( pos < end){
        result = '0'.repeat(pos) + payload + '0'.repeat(sz - end);
    } else{
        result = payload.substring(0,end);
        result += '0'.repeat(pos - end);
        result += payload.substring(end);
    }
    return result;
}



exports.generatePosHashXTimes = function generatePosHashXTimes(buffer, pos, size, count){ //generate positional hash
    var result  = buffer.toString("hex");

    /*if(pos != -1 )
        result[pos] = 0; */
    const crypto = require('crypto');
    for(var i = 0; i < count; i++){
        var hash = crypto.createHash('sha256');
        result = exports.wipeOutsidePayload(result, pos, size);
        hash.update(result);
        result = hash.digest('hex');
    }
    return exports.wipeOutsidePayload(result, pos, size);
}

exports.hashStringArray = function (counter, arr, payloadSize){
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    var result = counter.toString(16);

    for(var i = 0 ; i < 64; i++){
        result += exports.extractPayload(arr[i],i, payloadSize);
    }

    hash.update(result);
    var result = hash.digest('hex');
    return result;
}






function dumpMember(obj){
    var type = Array.isArray(obj) ? "array" : typeof obj;
    if(obj === null){
        return "null";
    }
    if(obj === undefined){
        return "undefined";
    }

    switch(type){
        case "number":
        case "string":return obj.toString(); break;
        case "object": return exports.dumpObjectForHashing(obj); break;
        case "boolean": return  obj? "true": "false"; break;
        case "array":
            var result = "";
            for(var i=0; i < obj.length; i++){
                result += exports.dumpObjectForHashing(obj[i]);
            }
            return result;
            break;
        default:
            throw new Error("Type " +  type + " cannot be cryptographically digested");
    }

}


exports.dumpObjectForHashing = function(obj){
    var result = "";

    if(obj === null){
        return "null";
    }
    if(obj === undefined){
        return "undefined";
    }

    var basicTypes = {
        "array"     : true,
        "number"    : true,
        "boolean"   : true,
        "string"    : true,
        "object"    : false
    }

    var type = Array.isArray(obj) ? "array" : typeof obj;
    if( basicTypes[type]){
        return dumpMember(obj);
    }

    var keys = Object.keys(obj);
    keys.sort();


    for(var i=0; i < keys.length; i++){
        result += dumpMember(keys[i]);
        result += dumpMember(obj[keys[i]]);
    }

    return result;
}


exports.hashValues  = function (values){
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    var result = exports.dumpObjectForHashing(values);
    hash.update(result);
    return hash.digest('hex');
};

exports.getJSONFromSignature = function getJSONFromSignature(signature, size){
    var result = {
        proof:[]
    };
    var a = signature.split(":");
    result.agent        = a[0];
    result.counter      =  parseInt(a[1], "hex");
    result.nextPublic   =  a[2];

    var proof = a[3]


    if(proof.length/size != 64) {
        throw new Error("Invalid signature " + proof);
    }

    for(var i = 0; i < 64; i++){
        result.proof.push(exports.fillPayload(proof.substring(i * size,(i+1) * size ), i, size))
    }

    return result;
}

exports.createSignature = function (agent,counter, nextPublic, arr, size){
    var result = "";

    for(var i = 0; i < arr.length; i++){
        result += exports.extractPayload(arr[i], i , size);
    }

    return agent + ":" + counter + ":" + nextPublic + ":" + result;
}
},{"crypto":false}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/apiHandler.js":[function(require,module,exports){
const querystring = require("querystring");

const handle = (dsu, res, requestedPath) => {
    const apiQuery = requestedPath.substr("/api?".length);
    let { name: functionName, arguments: args } = querystring.parse(apiQuery);

    try {
        args = JSON.parse(args);
    } catch (err) {
        res.statusCode = 400;
        return res.end("Invalid arguments provided");
    }

    dsu.call(functionName, ...args, (...result) => {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify(result));
    });
};

module.exports = {
    handle,
};

},{"querystring":false}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/apiStandardHandler.js":[function(require,module,exports){
const querystring = require("querystring");

const USER_DETAILS = "user-details.json";

const getAppSeed = function (dsu, path, appName, res) {
    dsu.listMountedDossiers(path, (err, result) => {
        if (err) {
            const errorMessage = "Error listing mounted DSU";
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        let selectedDsu = result.find((dsu) => dsu.path === appName);
        if (!selectedDsu) {
            const errorMessage = `Dossier with the name ${appName} was not found in the mounted points!`;
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        res.statusCode = 200;
        res.end(selectedDsu.identifier);
    });
};

const getUserDetails = function (dsu, res) {
    dsu.readFile(USER_DETAILS, (err, fileContent) => {
        if (err) {
            const errorMessage = "Error getting user details";
            console.log(errorMessage, err);
            res.statusCode = 500;
            return res.end(errorMessage);
        }

        const dataSerialization = fileContent.toString();
        res.statusCode = 200;
        res.end(dataSerialization);
    });
};

const handle = (dsu, res, requestedPath) => {
    const requestedApiPath = requestedPath.substr("/api-standard".length + 1);
    const requestedApiPathInfoMatch = requestedApiPath.match(/^([^\/\?]*)[\/\?](.*)$/);

    const apiMethod = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[1] : requestedApiPath;
    const apiParameter = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[2] : undefined;

    switch (apiMethod) {
        case "app-seed": {
            const { path, name } = querystring.parse(apiParameter);
            getAppSeed(dsu, path, name, res);
            return;
        }
        case "user-details": {
            getUserDetails(dsu, res);
            return;
        }
    }

    res.statusCode = 403;
    res.end("Unknow api-standard method");
};

module.exports = {
    handle,
};

},{"querystring":false}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/downloadHandler.js":[function(require,module,exports){
const MimeType = require("../browser/util/MimeType");

const handle = (dsu, res, requestedPath) => {
    function extractPath() {
        let path = requestedPath.split("/").slice(2); // remove the "/delete" or "/download" part
        path = path.filter((segment) => segment.length > 0).map((segment) => decodeURIComponent(segment));
        return path;
    }

    let path = extractPath();
    if (!path.length) {
        res.statusCode = 404;
        return res.end("File not found");
    }
    path = `/${path.join("/")}`;

    dsu.readFile(path, (err, stream) => {
        if (err) {
            if (err instanceof Error) {
                if (err.message.indexOf("could not be found") !== -1) {
                    res.statusCode = 404;
                    return res.end("File not found");
                }

                res.statusCode = 500;
                return res.end(err.message);
            }

            res.statusCode = 500;
            return res.end(Object.prototype.toString.call(err));
        }

        // Extract the filename
        const filename = path.split("/").pop();

        let fileExt = filename.substring(filename.lastIndexOf(".") + 1);
        res.setHeader("Content-Type", MimeType.getMimeTypeFromExtension(fileExt).name);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.statusCode = 200;
        res.end(stream);
    });
};

module.exports = {
    handle,
};

},{"../browser/util/MimeType":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/browser/util/MimeType.js"}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/fileRequestHandler.js":[function(require,module,exports){
const MimeType = require("../browser/util/MimeType");

const handle = (dsu, req, res, seed, requestedPath) => {
    const { url } = req;

    console.log(`Handling file: ${requestedPath}`);
    let file = requestedPath.split("?")[0]; // remove query params since this is a file request
    if (!file || file === "/" || file.indexOf(".") === -1) {
        file = "/index.html";
    }

    if (file.indexOf("/") !== 0) {
        file = `/${file}`;
    }
    console.log(`Handling file: ${file}`);

    // console.log(`Handling iframe with KeySSI: ${seed} and file: ${file}`);

    let fileExtension = file.substring(file.lastIndexOf(".") + 1);
    let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);

    const sendFile = (data) => {
        res.setHeader("Content-Type", mimeType.name);
        res.statusCode = 200;
        let content = data;
        if (!mimeType.binary) {
            content = data.toString();

            if (["htm", "html", "xhtml"].includes(fileExtension)) {
                const baseUrl = `${url.substr(0, url.indexOf("/iframe"))}/iframe/${seed}/`;
                content = content.replace(
                    "PLACEHOLDER_THAT_WILL_BE_REPLACED_BY_SW_OR_SERVER_WITH_BASE_TAG",
                    `<base href="${baseUrl}">`
                );
            }
        }

        res.end(content);
    };

    dsu.readFile(`/app${file}`, (err, fileContent) => {
        if (err) {
            dsu.readFile(`/code${file}`, (err, fileContent) => {
                if (err) {
                    console.log(`Error reading file /code${file}`, err);
                    res.statusCode = 500;
                    return res.end("Error reading file");
                }

                sendFile(fileContent);
            });
            return;
        }

        sendFile(fileContent);
    });
};

module.exports = {
    handle,
};

},{"../browser/util/MimeType":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/browser/util/MimeType.js"}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/uploadHandler.js":[function(require,module,exports){
const querystring = require("querystring");

const Uploader = require("../Uploader");

const handle = (dsu, req, res, requestedPath) => {
    let uploader;
    try {
        const query = requestedPath.substr(requestedPath.indexOf("?") + 1);
        const queryParams = querystring.parse(query);
        console.log({ queryParams });
        uploader = Uploader.configureUploader(queryParams, dsu);
    } catch (e) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 500;
        res.end(JSON.stringify(e.message));
        return;
    }

    let data = [];
    req.on("data", (chunk) => {
        console.log("chuink", chunk);
        data.push(chunk);
        // data += chunk;
    });

    req.on("end", () => {
        try {
            req.body = $$.Buffer.concat(data);
            console.log("req.body", req.body.toString())
            uploader.upload(req, function (err, uploadedFiles) {
                if (err && (!Array.isArray(uploadedFiles) || !uploadedFiles.length)) {
                    console.log(err);
                    let statusCode = 400; // Validation errors

                    if (err instanceof Error) {
                        // This kind of errors should indicate
                        // a serious problem with the uploader
                        // and the status code should reflect that
                        statusCode = 500; // Internal "server" errors
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.statusCode = statusCode;
                    res.end(
                        JSON.stringify(err, (key, value) => {
                            if (value instanceof Error) {
                                return value.message;
                            }

                            return value;
                        })
                    );

                    return;
                }

                res.setHeader("Content-Type", "application/json");
                res.statusCode = 201;
                res.end(JSON.stringify(uploadedFiles));
            });
        } catch (err) {
            console.log("worker error", err);
            res.statusCode = 500;
            res.end();
        }
    });
};

module.exports = {
    handle,
};

},{"../Uploader":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/Uploader/index.js","querystring":false}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/Uploader/FileReadableStreamAdapter.js":[function(require,module,exports){
const { Readable } = require('stream');
const util = require('util');

/**
 * Stream.Readable adapter for File ReadableStream
 * @param {File} file
 * @param {object} options
 */
function FileReadableStreamAdapter(file, options) {
    if (!(this instanceof FileReadableStreamAdapter)) {
        return new FileReadableStreamAdapter(file, options);
    }

    this.fileStreamReader = file.stream().getReader();
    Readable.call(this, options);
}
util.inherits(FileReadableStreamAdapter, Readable);

/**
 * Reads data from the File ReadableStreamDefaulReader
 * and pushes it into our Readable stream
 */
FileReadableStreamAdapter.prototype._read = function (size) {
    const pushData = (result) => {
        const done = result.done;
        const data = result.value;
        if (done) {
            this.push(null);
            return;
        }

        if (this.push($$.Buffer.from(data))) {
            return this.fileStreamReader.read().then(pushData);
        }
    }
    this.fileStreamReader.read()
        .then(pushData);
}

module.exports = FileReadableStreamAdapter;

},{"stream":false,"util":false}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/Uploader/index.js":[function(require,module,exports){
const FileReadableStreamAdapter = require("./FileReadableStreamAdapter");

const IS_NODE_ENV = typeof $$ !== "undefined" && $$.environmentType && $$.environmentType === "nodejs";

/**
 * Constructor
 *
 * @param {object} options
 * @param {string} options.inputName
 * @param {RawDossier} options.dossier
 * @param {string} options.uploadPath
 * @param {string} options.filename
 * @param {Array} options.allowedMimeTypes
 * @param {string} options.maxSize
 * @param {Boolean} options.preventOverwrite
 */
function Uploader(options) {
    this.inputName = null;
    this.dossier = null;
    this.filename = null; // Must be configured when doing a request body upload
    this.maxSize = null; // When not null file size validation is done
    this.allowedMimeTypes = null; // When not null, mime type validation is done
    this.uploadPath = null;
    this.preventOverwrite = false;
    this.uploadMultipleFiles = false;
    this.sizeMultiplier = {
        b: 1,
        k: 1000,
        m: 1000000,
    };

    this.configure(options);
}

// static method which creates/updates a given upload
Uploader.configureUploader = function (config, dossier, uploader) {
    config = config || {};

    if (!config.path) {
        throw new Error('Upload path is required. Ex: "POST /upload?path=/path/to/upload/folder"');
    }

    if (!config.input && !config.filename) {
        throw new Error(
            '"input" query parameter is required when doing multipart/form-data uploads or "filename" query parameter for request body uploads. Ex: POST /upload?input=files[] or POST /upload?filename=my-file.big'
        );
    }

    let uploadPath = config.path;
    if (uploadPath.substr(-1) !== "/") {
        uploadPath += "/";
    }

    let allowedTypes;
    if (typeof config.allowedTypes === "string" && config.allowedTypes.length) {
        allowedTypes = config.allowedTypes.split(",").filter((type) => type.length > 0);
    } else {
        allowedTypes = [];
    }
    const options = {
        inputName: config.input,
        filename: config.filename,
        maxSize: config.maxSize,
        allowedMimeTypes: allowedTypes,
        dossier,
        uploadPath: uploadPath,
        preventOverwrite: config.preventOverwrite,
    };

    if (!uploader) {
        uploader = new Uploader(options);
    } else {
        uploader.configure(options);
    }

    return uploader;
};



Uploader.prototype.Error = {
    UNKNOWN:"UNKNOWN_UPLOAD_ERROR",
    NO_FILES:"NO_FILES",
    INVALID_FILE:"INVALID_FILE",
    INVALID_TYPE:"INVALID_TYPE",
    MAX_SIZE_EXCEEDED:"MAX_SIZE_EXCEEDED",
    FILE_EXISTS:"FILE_EXISTS"
};

Uploader.prototype.configure = function (options) {
    options = options || {};

    if (
        (typeof options.inputName !== "string" || !options.inputName) &&
        (typeof options.filename !== "string" || !options.filename)
    ) {
        throw new Error("The input name or filename is required");
    }

    if (typeof options.dossier !== "object") {
        throw new Error("The dossier is required and must be an instance of RawDossier");
    }

    if (typeof options.uploadPath !== "string" || !options.uploadPath.length) {
        throw new Error("The upload path is missing");
    }

    this.inputName = options.inputName;
    this.dossier = options.dossier;
    this.uploadPath = options.uploadPath;
    this.preventOverwrite = Boolean(options.preventOverwrite);
    if (this.inputName) {
        this.uploadMultipleFiles = this.inputName.substr(-2) === "[]";
    }
    this.filename = options.filename || null;
    if (typeof options.maxSize === "number" || typeof options.maxSize === "string") {
        this.maxSize = options.maxSize;
    }

    if (Array.isArray(options.allowedMimeTypes)) {
        this.allowedMimeTypes = options.allowedMimeTypes;
    }
};

/**
 * @param {object|any} body
 * @throws {object}
 */
Uploader.prototype.validateRequestBody = function (body) {
    const inputName = this.inputName;
    const filename = this.filename;

    if (this.isMultipartUpload && !inputName) {
        const error = {
            message: `No files have been uploaded or the "input" parameter hasn't been set`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }

    if (!this.isMultipartUpload && !filename) {
        const error = {
            message: `No files have been uploaded or the "filename" parameter hasn't been set`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }

    const __uploadExists = () => {
        if (this.isMultipartUpload) {
            if (this.uploadMultipleFiles) {
                return Array.isArray(body[inputName]);
            }

            if (IS_NODE_ENV) {
                return !!body[inputName];
            }

            return body[inputName] instanceof File;
        }

        return body;
    };

    if (!__uploadExists()) {
        const error = {
            message: `No files have been uploaded or the "input"/"filename" parameters are missing`,
            code: this.Error.NO_FILES,
        };
        throw error;
    }
};

/**
 * Validate a single file
 *
 * @param {File} file
 * @throws {object}
 */
Uploader.prototype.validateFile = function (file) {
    if (!IS_NODE_ENV && !file instanceof File) {
        const error = {
            message: "File must be an instance of File",
            code: this.Error.INVALID_FILE,
        };
        throw error;
    }

    if (Array.isArray(this.allowedMimeTypes) && this.allowedMimeTypes.length) {
        const fileType = file.type;
        if (this.allowedMimeTypes.indexOf(fileType) === -1) {
            const error = {
                message: "File type is not allowed",
                code: this.Error.INVALID_TYPE,
            };
            throw error;
        }
    }

    if (this.maxSize !== null) {
        let unit = "b";
        if (typeof this.maxSize === "string") {
            unit = this.maxSize.substr("-1").toLowerCase();
        }

        const sizeMultiplier = this.sizeMultiplier[unit] || this.sizeMultiplier["b"];
        const maxSize = parseInt(this.maxSize, 10) * sizeMultiplier;

        if (isNaN(maxSize)) {
            const error = {
                message: `Invalid max size parameter: ${this.maxSize}`,
                code: this.Error.MAX_SIZE_EXCEEDED,
            };
            throw error;
        }

        if (file.size > maxSize) {
            const error = {
                message: `The file size must not exceed ${maxSize} bytes`,
                code: this.Error.MAX_SIZE_EXCEEDED,
            };
            throw error;
        }
    }
};

/**
 * Create a File object from the request body
 * @param {EventRequest} request
 * @return {File}
 */
Uploader.prototype.createFileFromRequest = function (request) {
    const requestBody = request.body;
    let file;
    if (IS_NODE_ENV) {
        file = {
            name: this.filename,
            content: requestBody,
            type: request.headers["content-type"] || "application/octet-stream",
            size: $$.Buffer.byteLength(requestBody),
        };
    } else {
        const type = request.get("Content-Type") || "application/octet-stream";
        file = new File([requestBody], this.filename, {
            type,
        });
    }

    return file;
};

/**
 * @param {File} file
 * @param {callback} callback
 */
Uploader.prototype.uploadFile = function (file, callback) {
    const destFile = `${this.uploadPath}${file.name}`;

    let uploadPath = this.uploadPath;
    if (uploadPath.substr(-1) === "/") {
        uploadPath = uploadPath.substr(0, uploadPath.length - 1);
    }

    const writeFile = () => {
        const doWriting = () => {
            this.dossier.writeFile(destFile, fileAsStreamOrBuffer, { ignoreMounts: false }, (err) => {
                callback(err, {
                    path: destFile,
                });
            });
        };

        let fileAsStreamOrBuffer;
        if (IS_NODE_ENV) {
            fileAsStreamOrBuffer = file.content;
            doWriting();
        } else {
            if (typeof file.stream === "function") {
                fileAsStreamOrBuffer = new FileReadableStreamAdapter(file);
                return doWriting();
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                fileAsStreamOrBuffer = e.target.result;
                let sep = ";base64,";
                if (fileAsStreamOrBuffer.indexOf(";base64,") !== -1) {
                    fileAsStreamOrBuffer = fileAsStreamOrBuffer.split(sep)[1];
                    fileAsStreamOrBuffer = atob(fileAsStreamOrBuffer);
                }
                return doWriting();
            };
            reader.onerror = function (e) {
                reader.abort();
            };
            reader.onabort = function (e) {
                return callback(reader.error);
            };
            reader.readAsDataURL(file);
        }
    };

    if (this.preventOverwrite) {
        // Check that file doesn't exist
        this.dossier.listFiles(uploadPath, (err, files) => {
            if (files) {
                if (files.indexOf(file.name) !== -1) {
                    const err = {
                        message: "File exists",
                        code: this.Error.FILE_EXISTS,
                    };
                    return callback(err, {
                        path: destFile,
                    });
                }
            }

            writeFile();
        });
    } else {
        writeFile();
    }
};

/**
 * TODO: Support for uploading the request body payload
 * @param {EventRequest} request
 * @param {callback} callback
 */
Uploader.prototype.upload = function (request, callback) {
    if (IS_NODE_ENV) {
        this.isMultipartUpload =
            typeof body === "object" &&
            !(body instanceof ArrayBuffer) &&
            request.headers["content-type"] &&
            request.headers["content-type"].indexOf("text/plain") === -1;
    } else {
        this.isMultipartUpload = typeof request.body === "object" && !(request.body instanceof ArrayBuffer);
    }

    console.log({isMultipartUpload: this.isMultipartUpload})

    try {
        this.validateRequestBody(request.body);
    } catch (e) {
        return callback(e);
    }

    let files = [];

    if (this.isMultipartUpload) {
        if (!this.uploadMultipleFiles) {
            files.push(request.body[this.inputName]);
        } else {
            files = request.body[this.inputName];
        }
    } else {
        const file = this.createFileFromRequest(request);
        files.push(file);
    }

    const filesUploaded = [];

    const uploadFileCallback = (file, err) => {
        const _callback = function (err, result) {
            const srcFile = {
                name: file.name,
                type: file.type,
            };

            if (err) {
                err = {
                    message: JSON.stringify(err),
                    code: this.Error.UNKNOWN,
                };

                filesUploaded.push({
                    file: srcFile,
                    error: err,
                });
            } else {
                filesUploaded.push({
                    file: srcFile,
                    result,
                });
            }

            if (filesUploaded.length === files.length) {
                let errors = filesUploaded.filter((item) => item.error !== undefined);
                const uploadedFiles = filesUploaded.filter((item) => item.result !== undefined);

                errors = errors.length ? errors : null;
                callback(errors, uploadedFiles);
            }
        };

        if (err) {
            return _callback.call(this, err);
        }
        return _callback.bind(this);
    };

    const filesCopy = [...files];

    const recursiveUpload = () => {
        const file = filesCopy.shift();

        if (!file) {
            return;
        }

        try {
            this.validateFile(file);
        } catch (e) {
            uploadFileCallback(file, e);
            recursiveUpload();
            return;
        }

        this.uploadFile(file, (err, result) => {
            const callback = uploadFileCallback(file);
            callback(err, result);
            recursiveUpload();
        });
    };
    recursiveUpload();
};

module.exports = Uploader;

},{"./FileReadableStreamAdapter":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/Uploader/FileReadableStreamAdapter.js"}],"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/browser/util/MimeType.js":[function(require,module,exports){
const extensionsMimeTypes = {
    "aac": {
        name: "audio/aac",
        binary: true
    },
    "abw": {
        name: "application/x-abiword",
        binary: true
    },
    "arc": {
        name: "application/x-freearc",
        binary: true
    },
    "avi": {
        name: "video/x-msvideo",
        binary: true
    },
    "azw": {
        name: "application/vnd.amazon.ebook",
        binary: true
    },
    "bin": {
        name: "application/octet-stream",
        binary: true
    }, "bmp": {
        name: "image/bmp",
        binary: true
    }, "bz": {
        name: "application/x-bzip",
        binary: true
    }, "bz2": {
        name: "application/x-bzip2",
        binary: true
    }, "csh": {
        name: "application/x-csh",
        binary: false
    }, "css": {
        name: "text/css",
        binary: false
    }, "csv": {
        name: "text/csv",
        binary: false
    }, "doc": {
        name: "application/msword",
        binary: true
    }, "docx": {
        name: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        binary: true
    }, "eot": {
        name: "application/vnd.ms-fontobject",
        binary: true
    }, "epub": {
        name: "application/epub+zip",
        binary: true
    }, "gz": {
        name: "application/gzip",
        binary: true
    }, "gif": {
        name: "image/gif",
        binary: true
    }, "htm": {
        name: "text/html",
        binary: false
    }, "html": {
        name: "text/html",
        binary: false
    }, "ico": {
        name: "image/vnd.microsoft.icon",
        binary: true
    }, "ics": {
        name: "text/calendar",
        binary: false
    }, "jpeg": {
        name: "image/jpeg",
        binary: true
    }, "jpg": {
        name: "image/jpeg",
        binary: true
    }, "js": {
        name: "text/javascript",
        binary: false
    }, "json": {
        name: "application/json",
        binary: false
    }, "jsonld": {
        name: "application/ld+json",
        binary: false
    }, "mid": {
        name: "audio/midi",
        binary: true
    }, "midi": {
        name: "audio/midi",
        binary: true
    }, "mjs": {
        name: "text/javascript",
        binary: false
    }, "mp3": {
        name: "audio/mpeg",
        binary: true
    }, "mpeg": {
        name: "video/mpeg",
        binary: true
    },
	"mp4": {
		name: "video/mp4",
		binary: true
	},"mpkg": {
        name: "application/vnd.apple.installer+xm",
        binary: true
    }, "odp": {
        name: "application/vnd.oasis.opendocument.presentation",
        binary: true
    }, "ods": {
        name: "application/vnd.oasis.opendocument.spreadsheet",
        binary: true
    }, "odt": {
        name: "application/vnd.oasis.opendocument.text",
        binary: true
    }, "oga": {
        name: "audio/ogg",
        binary: true
    },
    "ogv": {
        name: "video/ogg",
        binary: true
    },
    "ogx": {
        name: "application/ogg",
        binary: true
    },
    "opus": {
        name: "audio/opus",
        binary: true
    },
    "otf": {
        name: "font/otf",
        binary: true
    },
    "png": {
        name: "image/png",
        binary: true
    },
    "pdf": {
        name: "application/pdf",
        binary: true
    },
    "php": {
        name: "application/php",
        binary: false
    },
    "ppt": {
        name: "application/vnd.ms-powerpoint",
        binary: true
    },
    "pptx": {
        name: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        binary: true
    },
    "rtf": {
        name: "application/rtf",
        binary: true
    },
    "sh": {
        name: "application/x-sh",
        binary: false
    },
    "svg": {
        name: "image/svg+xml",
        binary: false
    },
    "swf": {
        name: "application/x-shockwave-flash",
        binary: true
    },
    "tar": {
        name: "application/x-tar",
        binary: true
    },
    "tif": {
        name: "image/tiff",
        binary: true
    },
    "tiff": {
        name: "image/tiff",
        binary: true
    },
    "ts": {
        name: "video/mp2t",
        binary: true
    },
    "ttf": {
        name: "font/ttf",
        binary: true
    },
    "txt": {
        name: "text/plain",
        binary: false
    },
    "vsd": {
        name: "application/vnd.visio",
        binary: true
    },
    "wav": {
        name: "audio/wav",
        binary: true
    },
    "weba": {
        name: "audio/webm",
        binary: true
    },
    "webm": {
        name: "video/webm",
        binary: true
    },
    "webp": {
        name: "image/webp",
        binary: true
    },
    "woff": {
        name: "font/woff",
        binary: true
    },
    "woff2": {
        name: "font/woff2",
        binary: true
    },
    "xhtml": {
        name: "application/xhtml+xml",
        binary: false
    },
    "xls": {
        name: "application/vnd.ms-excel",
        binary: true
    },
    "xlsx": {
        name: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        binary: true
    },
    "xml": {
        name: "text/xml",
        binary: false
    },
    "xul": {
        name: "application/vnd.mozilla.xul+xml",
        binary: true
    },
    "zip": {
        name: "application/zip",
        binary: true
    },
    "3gp": {
        name: "video/3gpp",
        binary: true
    },
    "3g2": {
        name: "video/3gpp2",
        binary: true
    },
    "7z": {
        name: "application/x-7z-compressed",
        binary: true
    }
};

const defaultMimeType = {
    name: "text/plain",
    binary: false
};
module.exports.getMimeTypeFromExtension = function (extension) {
    if (typeof extensionsMimeTypes[extension] !== "undefined") {
        return extensionsMimeTypes[extension];
    }
    return defaultMimeType;
};

},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/Combos.js":[function(require,module,exports){
function product(args) {
    if(!args.length){
        return [ [] ];
    }
    var prod = product(args.slice(1)), r = [];
    args[0].forEach(function(x) {
        prod.forEach(function(p) {
            r.push([ x ].concat(p));
        });
    });
    return r;
}

function objectProduct(obj) {
    var keys = Object.keys(obj),
        values = keys.map(function(x) { return obj[x]; });

    return product(values).map(function(p) {
        var e = {};
        keys.forEach(function(k, n) { e[k] = p[n]; });
        return e;
    });
}

module.exports = objectProduct;
},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/OwM.js":[function(require,module,exports){
var meta = "meta";

function OwM(serialized){

    if(serialized){
        return OwM.prototype.convert(serialized);
    }

    Object.defineProperty(this, meta, {
        writable: false,
        enumerable: true,
        value: {}
    });

    Object.defineProperty(this, "setMeta", {
        writable: false,
        enumerable: false,
        configurable:false,
        value: function(prop, value){
            if(typeof prop == "object" && typeof value == "undefined"){
                for(var p in prop){
                    this[meta][p] = prop[p];
                }
                return prop;
            }
            this[meta][prop] = value;
            return value;
        }
    });

    Object.defineProperty(this, "getMeta", {
        writable: false,
        value: function(prop){
            return this[meta][prop];
        }
    });
}

function testOwMSerialization(obj){
    let res = false;

    if(obj){
        res = typeof obj[meta] != "undefined" && !(obj instanceof OwM);
    }

    return res;
}

OwM.prototype.convert = function(serialized){
    const owm = new OwM();

    for(var metaProp in serialized.meta){
        if(!testOwMSerialization(serialized[metaProp])) {
            owm.setMeta(metaProp, serialized.meta[metaProp]);
        }else{
            owm.setMeta(metaProp, OwM.prototype.convert(serialized.meta[metaProp]));
        }
    }

    for(var simpleProp in serialized){
        if(simpleProp === meta) {
            continue;
        }

        if(!testOwMSerialization(serialized[simpleProp])){
            owm[simpleProp] = serialized[simpleProp];
        }else{
            owm[simpleProp] = OwM.prototype.convert(serialized[simpleProp]);
        }
    }

    return owm;
};

OwM.prototype.getMetaFrom = function(obj, name){
    var res;
    if(!name){
        res = obj[meta];
    }else{
        res = obj[meta][name];
    }
    return res;
};

OwM.prototype.setMetaFor = function(obj, name, value){
    obj[meta][name] = value;
    return obj[meta][name];
};

module.exports = OwM;
},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/Queue.js":[function(require,module,exports){
function QueueElement(content) {
	this.content = content;
	this.next = null;
}

function Queue() {
	this.head = null;
	this.tail = null;
	this.length = 0;
	this.push = function (value) {
		const newElement = new QueueElement(value);
		if (!this.head) {
			this.head = newElement;
			this.tail = newElement;
		} else {
			this.tail.next = newElement;
			this.tail = newElement;
		}
		this.length++;
	};

	this.pop = function () {
		if (!this.head) {
			return null;
		}
		const headCopy = this.head;
		this.head = this.head.next;
		this.length--;

		//fix???????
		if(this.length === 0){
            this.tail = null;
		}

		return headCopy.content;
	};

	this.front = function () {
		return this.head ? this.head.content : undefined;
	};

	this.isEmpty = function () {
		return this.head === null;
	};

    this.remove = function (el) {
        if (this.length === 1 && el === this.front()) {
            this.head = this.tail = null;
            this.length--;
            return;
        }

        if (el === this.front()) {
            this.pop();
            return;
        }

        let head = this.head;
        let prev = null;
        while (head !== null) {
            if (head.content !== el) {
                prev = head;
                head = head.next;
                continue;
            }

            prev.next = head.next;
            this.length--;

            if (head === this.tail) {
                this.tail = prev;
            }
            return;
        }

    }

	this[Symbol.iterator] = function* () {
		let head = this.head;
		while(head !== null) {
			yield head.content;
			head = head.next;
		}
	}.bind(this);
}

Queue.prototype.toString = function () {
	let stringifiedQueue = '';
	let iterator = this.head;
	while (iterator) {
		stringifiedQueue += `${JSON.stringify(iterator.content)} `;
		iterator = iterator.next;
	}
	return stringifiedQueue;
};

Queue.prototype.inspect = Queue.prototype.toString;

module.exports = Queue;

},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/SwarmPacker.js":[function(require,module,exports){
const HEADER_SIZE_RESEARVED = 4;

function SwarmPacker(){
}

function copyStringtoArrayBuffer(str, buffer){
    if(typeof str !== "string"){
        throw new Error("Wrong param type received");
    }
    for(var i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
    }
    return buffer;
}

function copyFromBuffer(target, source){
    for(let i=0; i<source.length; i++){
        target[i] = source[i];
    }
    return target;
}

let serializers = {};

SwarmPacker.registerSerializer = function(name, implementation){
    if(serializers[name]){
        throw new Error("Serializer name already exists");
    }
    serializers[name] = implementation;
};

function getSerializer(name){
    return serializers[name];
}

SwarmPacker.getSerializer = getSerializer;

Object.defineProperty(SwarmPacker.prototype, "JSON", {value: "json"});
Object.defineProperty(SwarmPacker.prototype, "MSGPACK", {value: "msgpack"});

SwarmPacker.registerSerializer(SwarmPacker.prototype.JSON, {
    serialize: JSON.stringify,
    deserialize: (serialization)=>{
        if(typeof serialization !== "string"){
            serialization = String.fromCharCode.apply(null, serialization);
        }
        return JSON.parse(serialization);
    },
    getType: ()=>{
        return SwarmPacker.prototype.JSON;
    }
});

function registerMsgPackSerializer(){
    const mp = '@msgpack/msgpack';
    let msgpack;

    try{
        msgpack = require(mp);
        if (typeof msgpack === "undefined") {
            throw new Error("msgpack is unavailable.")
        }
    }catch(err){
        console.log("msgpack not available. If you need msgpack serialization include msgpack in one of your bundles");
        //preventing msgPack serializer being register if msgPack dep is not found.
        return;
    }

    SwarmPacker.registerSerializer(SwarmPacker.prototype.MSGPACK, {
        serialize: msgpack.encode,
        deserialize: msgpack.decode,
        getType: ()=>{
            return SwarmPacker.prototype.MSGPACK;
        }
    });
}

registerMsgPackSerializer();

SwarmPacker.pack = function(swarm, serializer){

    let jsonSerializer = getSerializer(SwarmPacker.prototype.JSON);
    if(typeof serializer === "undefined"){
        serializer = jsonSerializer;
    }

    let swarmSerialization = serializer.serialize(swarm);

    let header = {
        command: swarm.getMeta("command"),
        swarmId : swarm.getMeta("swarmId"),
        swarmTypeName: swarm.getMeta("swarmTypeName"),
        swarmTarget: swarm.getMeta("target"),
        serializationType: serializer.getType()
    };

    header = serializer.serialize(header);

    if(header.length >= Math.pow(2, 32)){
        throw new Error("Swarm serialization too big.");
    }

    //arraybuffer construction
    let size = HEADER_SIZE_RESEARVED + header.length + swarmSerialization.length;
    let pack = new ArrayBuffer(size);

    let sizeHeaderView = new DataView(pack, 0);
    sizeHeaderView.setUint32(0, header.length);

    let headerView = new Uint8Array(pack, HEADER_SIZE_RESEARVED);
    copyStringtoArrayBuffer(header, headerView);

    let serializationView = new Uint8Array(pack, HEADER_SIZE_RESEARVED+header.length);
    if(typeof swarmSerialization === "string"){
        copyStringtoArrayBuffer(swarmSerialization, serializationView);
    }else{
        copyFromBuffer(serializationView, swarmSerialization);
    }

    return pack;
};

SwarmPacker.unpack = function(pack){
    let jsonSerialiser = SwarmPacker.getSerializer(SwarmPacker.prototype.JSON);
    let headerSerialization = getHeaderSerializationFromPack(pack);
    let header = jsonSerialiser.deserialize(headerSerialization);

    let serializer = SwarmPacker.getSerializer(header.serializationType);
    let messageView = new Uint8Array(pack, HEADER_SIZE_RESEARVED+headerSerialization.length);

    let swarm = serializer.deserialize(messageView);
    return swarm;
};

function getHeaderSerializationFromPack(pack){
    let headerSize = new DataView(pack).getUint32(0);

    let headerView = new Uint8Array(pack, HEADER_SIZE_RESEARVED, headerSize);
    return headerView;
}

SwarmPacker.getHeader = function(pack){
    let jsonSerialiser = SwarmPacker.getSerializer(SwarmPacker.prototype.JSON);
    let header = jsonSerialiser.deserialize(getHeaderSerializationFromPack(pack));

    return header;
};
module.exports = SwarmPacker;
},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/TaskCounter.js":[function(require,module,exports){

function TaskCounter(finalCallback) {
	let results = [];
	let errors = [];

	let started = 0;

	function decrement(err, res) {
		if(err) {
			errors.push(err);
		}

		if(arguments.length > 2) {
			arguments[0] = undefined;
			res = arguments;
		}

		if(typeof res !== "undefined") {
			results.push(res);
		}

		if(--started <= 0) {
            return callCallback();
		}
	}

	function increment(amount = 1) {
		started += amount;
	}

	function callCallback() {
	    if(errors && errors.length === 0) {
	        errors = undefined;
        }

	    if(results && results.length === 0) {
	        results = undefined;
        }

        finalCallback(errors, results);
    }

	return {
		increment,
		decrement
	};
}

module.exports = TaskCounter;
},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/beesHealer.js":[function(require,module,exports){
const OwM = require("./OwM");

/*
    Prepare the state of a swarm to be serialised
*/

exports.asJSON = function(valueObj, phaseName, args, callback){

        let valueObject = valueObj.valueOf();
        let res = new OwM();
        res.publicVars          = valueObject.publicVars;
        res.privateVars         = valueObject.privateVars;

        res.setMeta("COMMAND_ARGS",        OwM.prototype.getMetaFrom(valueObject, "COMMAND_ARGS"));
        res.setMeta("SecurityParadigm",        OwM.prototype.getMetaFrom(valueObject, "SecurityParadigm"));
        res.setMeta("swarmTypeName", OwM.prototype.getMetaFrom(valueObject, "swarmTypeName"));
        res.setMeta("swarmId",       OwM.prototype.getMetaFrom(valueObject, "swarmId"));
        res.setMeta("target",        OwM.prototype.getMetaFrom(valueObject, "target"));
        res.setMeta("homeSecurityContext",        OwM.prototype.getMetaFrom(valueObject, "homeSecurityContext"));
        res.setMeta("requestId",        OwM.prototype.getMetaFrom(valueObject, "requestId"));


        if(!phaseName){
            res.setMeta("command", "stored");
        } else {
            res.setMeta("phaseName", phaseName);
            res.setMeta("phaseId", $$.uidGenerator.safe_uuid());
            res.setMeta("args", args);
            res.setMeta("command", OwM.prototype.getMetaFrom(valueObject, "command") || "executeSwarmPhase");
        }

        res.setMeta("waitStack", valueObject.meta.waitStack); //TODO: think if is not better to be deep cloned and not referenced!!!

        if(callback){
            return callback(null, res);
        }
        //console.log("asJSON:", res, valueObject);
        return res;
};

exports.jsonToNative = function(serialisedValues, result){

    for(let v in serialisedValues.publicVars){
        result.publicVars[v] = serialisedValues.publicVars[v];

    };
    for(let l in serialisedValues.privateVars){
        result.privateVars[l] = serialisedValues.privateVars[l];
    };

    for(let i in OwM.prototype.getMetaFrom(serialisedValues)){
        OwM.prototype.setMetaFor(result, i, OwM.prototype.getMetaFrom(serialisedValues, i));
    };

};
},{"./OwM":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/OwM.js"}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/path.js":[function(require,module,exports){
function replaceAll(str, search, replacement) {
    return str.split(search).join(replacement);
}

function resolvePath(pth) {
    let pathSegments = pth.split("/");
    let makeAbsolute = pathSegments[0] === "" ? true : false;
    for (let i = 0; i < pathSegments.length; i++) {
        let segment = pathSegments[i];
        if (segment === "..") {
            let j = 1;
            if (i > 0) {
                j = j + 1;
            }
            // else {
            //     makeAbsolute = true;
            // }
            pathSegments.splice(i + 1 - j, j);
            i = i - j;
        }
    }
    let res = pathSegments.join("/");
    if (makeAbsolute && res !== "") {
        res = __ensureIsAbsolute(res);
    }
    return res;
}

function normalize(pth) {
    if (typeof pth !== "string") {
        throw new TypeError();
    }
    pth = replaceAll(pth, "\\", "/");
    pth = replaceAll(pth, /[/]+/, "/");

    return resolvePath(pth);
}

function join(...args) {
    let pth = "";
    for (let i = 0; i < args.length; i++) {
        if (i !== 0 && args[i - 1] !== "") {
            pth += "/";
        }

        pth += args[i];
    }

    return normalize(pth);
}

function __ensureIsAbsolute(pth) {
    if (pth[0] !== "/") {
        pth = "/" + pth;
    }
    return pth;
}

function isAbsolute(pth) {
    pth = normalize(pth);
    //on windows ":" is used as separator after partition ID
    if (pth[0] !== "/" && pth[1] !== ":") {
        return false;
    }

    return true;
}

function ensureIsAbsolute(pth) {
    pth = normalize(pth);
    return __ensureIsAbsolute(pth);
}

function isSubpath(path, subPath) {
    path = normalize(path);
    subPath = normalize(subPath);
    let result = false;
    if (path.indexOf(subPath) === 0) {
        let char = path[subPath.length];
        if (char === "" || char === "/" || subPath === "/") {
            result = true;
        }
    }

    return result;
}

function dirname(path) {
    if (path === "/") {
        return path;
    }
    const pathSegments = path.split("/");
    pathSegments.pop();
    return ensureIsAbsolute(pathSegments.join("/"));
}

function basename(path) {
    if (path === "/") {
        return path;
    }
    return path.split("/").pop;
}

function relative(from, to) {
    from = normalize(from);
    to = normalize(to);

    const fromSegments = from.split("/");
    const toSegments = to.split("/");
    let splitIndex;
    for (let i = 0; i < fromSegments.length; i++) {
        if (fromSegments[i] !== toSegments[i]) {
            break;
        }
        splitIndex = i;
    }

    if (typeof splitIndex === "undefined") {
        throw Error(`The paths <${from}> and <${to}> have nothing in common`);
    }

    splitIndex++;
    let relativePath = [];
    for (let i = splitIndex; i < fromSegments.length; i++) {
        relativePath.push("..");
    }
    for (let i = splitIndex; i < toSegments.length; i++) {
        relativePath.push(toSegments[i]);
    }

    return relativePath.join("/");
}

function resolve(...pathArr) {
    function __resolvePathRecursively(currentPath) {
        let lastSegment = pathArr.pop();
        if (typeof currentPath === "undefined") {
            currentPath = lastSegment;
        } else {
            currentPath = join(lastSegment, currentPath);
        }
        if (isAbsolute(currentPath)) {
            return currentPath;
        }

        if (pathArr.length === 0) {
            let cwd;
            try {
                cwd = process.cwd();
            } catch (e) {
                cwd = "/";
            }

            return join(cwd, currentPath);
        }

        return __resolvePathRecursively(currentPath);
    }

    return __resolvePathRecursively();
}

function extname(path){
    path = resolvePath(path);
    let ext = path.match(/\.[0-9a-z]+$/i);
    if (Array.isArray(ext)) {
        ext = ext[0];
    } else {
        ext = "";
    }
    return ext;
}

module.exports = {
    normalize,
    join,
    isAbsolute,
    ensureIsAbsolute,
    isSubpath,
    dirname,
    basename,
    relative,
    resolve,
    extname
};

},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/pingpongFork.js":[function(require,module,exports){
const PING = "PING";
const PONG = "PONG";

module.exports.fork = function pingPongFork(modulePath, args, options){
    const child_process = require("child_process");
    const defaultStdio = ["inherit", "inherit", "inherit", "ipc"];

    if(!options){
        options = {stdio: defaultStdio};
    }else{
        if(typeof options.stdio === "undefined"){
            options.stdio = defaultStdio;
        }

        let stdio = options.stdio;
        if(stdio.length<3){
            for(let i=stdio.length; i<4; i++){
                stdio.push("inherit");
            }
            stdio.push("ipc");
        }
    }

    let child = child_process.fork(modulePath, args, options);

    child.on("message", (message)=>{
        if(message === PING){
            child.send(PONG);
        }
    });

    return child;
};

module.exports.enableLifeLine = function(timeout){

    if(typeof process.send === "undefined"){
        console.log("\"process.send\" not found. LifeLine mechanism disabled!");
        return;
    }

    let lastConfirmationTime;
    const interval = timeout || 2000;

    // this is needed because new Date().getTime() has reduced precision to mitigate timer based attacks
    // for more information see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime
    const roundingError = 101;

    function sendPing(){
        try {
            process.send(PING);
        } catch (e) {
            console.log('Parent is not available, shutting down');
            exit(1)
        }
    }

    process.on("message", function (message){
        if(message === PONG){
            lastConfirmationTime = new Date().getTime();
        }
    });

    function exit(code){
        setTimeout(()=>{
            process.exit(code);
        }, 0);
    }

    const exceptionEvents = ["SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM", "SIGHUP"];
    let killingSignal = false;
    for(let i=0; i<exceptionEvents.length; i++){
        process.on(exceptionEvents[i], (event, code)=>{
            killingSignal = true;
            clearInterval(timeoutInterval);
            console.log(`Caught event type [${exceptionEvents[i]}]. Shutting down...`, code, event);
            exit(code);
        });
    }

    const timeoutInterval = setInterval(function(){
        const currentTime = new Date().getTime();

        if(typeof lastConfirmationTime === "undefined" || currentTime - lastConfirmationTime < interval + roundingError && !killingSignal){
            sendPing();
        }else{
            console.log("Parent process did not answer. Shutting down...", process.argv, killingSignal);
            exit(1);
        }
    }, interval);
};
},{"child_process":false}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/pskconsole.js":[function(require,module,exports){
var commands = {};
var commands_help = {};

//global function addCommand
addCommand = function addCommand(verb, adverbe, funct, helpLine){
    var cmdId;
    if(!helpLine){
        helpLine = " ";
    } else {
        helpLine = " " + helpLine;
    }
    if(adverbe){
        cmdId = verb + " " +  adverbe;
        helpLine = verb + " " +  adverbe + helpLine;
    } else {
        cmdId = verb;
        helpLine = verb + helpLine;
    }
    commands[cmdId] = funct;
        commands_help[cmdId] = helpLine;
};

function doHelp(){
    console.log("List of commands:");
    for(var l in commands_help){
        console.log("\t", commands_help[l]);
    }
}

addCommand("-h", null, doHelp, "\t\t\t\t\t\t |just print the help");
addCommand("/?", null, doHelp, "\t\t\t\t\t\t |just print the help");
addCommand("help", null, doHelp, "\t\t\t\t\t\t |just print the help");


function runCommand(){
  var argv = Object.assign([], process.argv);
  var cmdId = null;
  var cmd = null;
  argv.shift();
  argv.shift();

  if(argv.length >=1){
      cmdId = argv[0];
      cmd = commands[cmdId];
      argv.shift();
  }


  if(!cmd && argv.length >=1){
      cmdId = cmdId + " " + argv[0];
      cmd = commands[cmdId];
      argv.shift();
  }

  if(!cmd){
    if(cmdId){
        console.log("Unknown command: ", cmdId);
    }
    cmd = doHelp;
  }

  cmd.apply(null,argv);

}

module.exports = {
    runCommand
};


},{}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/safe-uuid.js":[function(require,module,exports){

function encode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=+$/, '');
};

function stampWithTime(buf, salt, msalt){
    if(!salt){
        salt = 1;
    }
    if(!msalt){
        msalt = 1;
    }
    var date = new Date;
    var ct = Math.floor(date.getTime() / salt);
    var counter = 0;
    while(ct > 0 ){
        //console.log("Counter", counter, ct);
        buf[counter*msalt] = Math.floor(ct % 256);
        ct = Math.floor(ct / 256);
        counter++;
    }
}

/*
    The uid contains around 256 bits of randomness and are unique at the level of seconds. This UUID should by cryptographically safe (can not be guessed)

    We generate a safe UID that is guaranteed unique (by usage of a PRNG to geneate 256 bits) and time stamping with the number of seconds at the moment when is generated
    This method should be safe to use at the level of very large distributed systems.
    The UUID is stamped with time (seconds): does it open a way to guess the UUID? It depends how safe is "crypto" PRNG, but it should be no problem...

 */

var generateUid = null;

exports.init = function(externalGenerator){
    generateUid = externalGenerator.generateUid;
    return module.exports;
};

exports.safe_uuid = function() {
    var buf = generateUid(32);
    stampWithTime(buf, 1000, 3);
    return encode(buf);
};



/*
    Try to generate a small UID that is unique against chance in the same millisecond second and in a specific context (eg in the same choreography execution)
    The id contains around 6*8 = 48  bits of randomness and are unique at the level of milliseconds
    This method is safe on a single computer but should be used with care otherwise
    This UUID is not cryptographically safe (can be guessed)
 */
exports.short_uuid = function(callback) {
    require('crypto').randomBytes(12, function (err, buf) {
        if (err) {
            callback(err);
            return;
        }
        stampWithTime(buf,1,2);
        callback(null, encode(buf));
    });
};
},{"crypto":false}],"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/uidGenerator.js":[function(require,module,exports){
function UidGenerator(minBuffers, buffersSize) {
    const Queue = require("./Queue");
    var PSKBuffer = typeof $$ !== "undefined" && $$.PSKBuffer ? $$.PSKBuffer : $$.Buffer;

    var buffers = new Queue();
    var lowLimit = .2;

    function fillBuffers(size) {
        //notifyObserver();
        const sz = size || minBuffers;
        if (buffers.length < Math.floor(minBuffers * lowLimit)) {
            for (var i = buffers.length; i < sz; i++) {
                generateOneBuffer(null);
            }
        }
    }

    fillBuffers();

    function generateOneBuffer(b) {
        if (!b) {
            b = PSKBuffer.alloc(0);
        }
        const sz = buffersSize - b.length;
        /*crypto.randomBytes(sz, function (err, res) {
            buffers.push($$.Buffer.concat([res, b]));
            notifyObserver();
        });*/
        buffers.push(PSKBuffer.concat([require('crypto').randomBytes(sz), b]));
        notifyObserver();
    }

    function extractN(n) {
        var sz = Math.floor(n / buffersSize);
        var ret = [];

        for (var i = 0; i < sz; i++) {
            ret.push(buffers.pop());
            setTimeout(generateOneBuffer, 1);
        }


        var remainder = n % buffersSize;
        if (remainder > 0) {
            var front = buffers.pop();
            ret.push(front.slice(0, remainder));
            //generateOneBuffer(front.slice(remainder));
            setTimeout(function () {
                generateOneBuffer(front.slice(remainder));
            }, 1);
        }

        //setTimeout(fillBuffers, 1);

        return $$.Buffer.concat(ret);
    }

    var fillInProgress = false;

    this.generateUid = function (n) {
        var totalSize = buffers.length * buffersSize;
        if (n <= totalSize) {
            return extractN(n);
        } else {
            if (!fillInProgress) {
                fillInProgress = true;
                setTimeout(function () {
                    fillBuffers(Math.floor(minBuffers * 2.5));
                    fillInProgress = false;
                }, 1);
            }
            return require('crypto').randomBytes(n);
        }
    };

    var observer;
    this.registerObserver = function (obs) {
        if (observer) {
            console.error(new Error("One observer allowed!"));
        } else {
            if (typeof obs == "function") {
                observer = obs;
                //notifyObserver();
            }
        }
    };

    function notifyObserver() {
        if (observer) {
            var valueToReport = buffers.length * buffersSize;
            setTimeout(function () {
                observer(null, {"size": valueToReport});
            }, 10);
        }
    }
}

module.exports.createUidGenerator = function (minBuffers, bufferSize) {
    return new UidGenerator(minBuffers, bufferSize);
};

},{"./Queue":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/Queue.js","crypto":false}],"bar-fs-adapter":[function(require,module,exports){
module.exports.createFsAdapter = () => {
    const FsAdapter = require("./lib/FsAdapter");
    return new FsAdapter();
};
},{"./lib/FsAdapter":"/home/runner/work/privatesky/privatesky/modules/bar-fs-adapter/lib/FsAdapter.js"}],"bar":[function(require,module,exports){

const ArchiveConfigurator = require("./lib/ArchiveConfigurator");
const createFolderBrickStorage = require("./lib/obsolete/FolderBrickStorage").createFolderBrickStorage;
const createFileBrickStorage = require("./lib/obsolete/FileBrickStorage").createFileBrickStorage;

ArchiveConfigurator.prototype.registerStorageProvider("FolderBrickStorage", createFolderBrickStorage);
ArchiveConfigurator.prototype.registerStorageProvider("FileBrickStorage", createFileBrickStorage);

module.exports.ArchiveConfigurator = ArchiveConfigurator;
module.exports.createBrick = (config) => {
    const Brick = require("./lib/Brick");
    return new Brick(config);
};

module.exports.createArchive = (archiveConfigurator) => {
    const Archive = require("./lib/Archive");
    return new Archive(archiveConfigurator);
};
module.exports.createArchiveConfigurator = () => {
    return new ArchiveConfigurator();
};

module.exports.createBrickMap = (header) => {
    const BrickMap = require("./lib/BrickMap");
    return new BrickMap(header);
};

module.exports.isArchive = (archive) => {
    const Archive = require('./lib/Archive');
    return archive instanceof Archive;
}

module.exports.BrickMapDiff = require('./lib/BrickMapDiff');
module.exports.BrickMapStrategyFactory = require('./lib/BrickMapStrategy');
module.exports.BrickMapStrategyMixin = require('./lib/BrickMapStrategy/BrickMapStrategyMixin');
module.exports.createFolderBrickStorage = createFolderBrickStorage;
module.exports.createFileBrickStorage = createFileBrickStorage;

},{"./lib/Archive":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Archive.js","./lib/ArchiveConfigurator":"/home/runner/work/privatesky/privatesky/modules/bar/lib/ArchiveConfigurator.js","./lib/Brick":"/home/runner/work/privatesky/privatesky/modules/bar/lib/Brick.js","./lib/BrickMap":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMap.js","./lib/BrickMapDiff":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapDiff.js","./lib/BrickMapStrategy":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/index.js","./lib/BrickMapStrategy/BrickMapStrategyMixin":"/home/runner/work/privatesky/privatesky/modules/bar/lib/BrickMapStrategy/BrickMapStrategyMixin.js","./lib/obsolete/FileBrickStorage":"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FileBrickStorage.js","./lib/obsolete/FolderBrickStorage":"/home/runner/work/privatesky/privatesky/modules/bar/lib/obsolete/FolderBrickStorage.js"}],"key-ssi-resolver":[function(require,module,exports){
const KeySSIResolver = require('./lib/KeySSIResolver');
const DSUFactory = require("./lib/DSUFactoryRegistry");

/**
 * Create a new KeySSIResolver instance and append it to
 * global object $$
 *
 * @param {object} options
 */
function initialize(options) {
    options = options || {};


    const BrickMapStrategyFactory = require("bar").BrickMapStrategyFactory;

    const brickMapStrategyFactory = new BrickMapStrategyFactory();
    const keySSIFactory = require('./lib/KeySSIs/KeySSIFactory');

    options.dsuFactory =  new DSUFactory({
        brickMapStrategyFactory,
        keySSIFactory
    });

    const keySSIResolver = new KeySSIResolver(options);

    return keySSIResolver;
}

module.exports = {
    initialize,
    KeySSIFactory: require('./lib/KeySSIs/KeySSIFactory'),
    CryptoAlgorithmsRegistry: require('./lib/CryptoAlgorithms/CryptoAlgorithmsRegistry'),
    CryptoFunctionTypes: require('./lib/CryptoAlgorithms/CryptoFunctionTypes'),
    SSITypes: require("./lib/KeySSIs/SSITypes"),
    DSUFactory: require("./lib/DSUFactoryRegistry")
};

},{"./lib/CryptoAlgorithms/CryptoAlgorithmsRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoAlgorithmsRegistry.js","./lib/CryptoAlgorithms/CryptoFunctionTypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/CryptoAlgorithms/CryptoFunctionTypes.js","./lib/DSUFactoryRegistry":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/DSUFactoryRegistry/index.js","./lib/KeySSIResolver":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIResolver.js","./lib/KeySSIs/KeySSIFactory":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/KeySSIFactory.js","./lib/KeySSIs/SSITypes":"/home/runner/work/privatesky/privatesky/modules/key-ssi-resolver/lib/KeySSIs/SSITypes.js","bar":"bar"}],"opendsu":[function(require,module,exports){
/*
html API space
*/

let constants = require("./moduleConstants.js");

switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
        if (typeof self !== "undefined") {
            if(!self.PREVENT_DOUBLE_LOADING_OF_OPENDSU) {
                self.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        if (typeof window !== "undefined") {
            if(!window.PREVENT_DOUBLE_LOADING_OF_OPENDSU){
                window.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
    default:
        if (typeof global !== "undefined") {
            if(!global.PREVENT_DOUBLE_LOADING_OF_OPENDSU){
                global.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
}

if(!PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED){
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED = true;
    function loadApi(apiSpaceName){
        switch (apiSpaceName) {
            case "http":return require("./http"); break;
            case "crypto":return require("./crypto"); break;
            case "anchoring":return require("./anchoring"); break;
            case "contracts":return require("./contracts"); break;
            case "bricking":return require("./bricking"); break;
            case "bdns":return require("./bdns"); break;
            case "boot":return require("./boot"); break;
            case "dc":return require("./dc"); break;
            case "dt":return require("./dt"); break;
            case "keyssi":return require("./keyssi"); break;
            case "mq":return require("./mq"); break;
            case "notifications":return require("./notifications"); break;
            case "resolver":return require("./resolver"); break;
            case "sc":return require("./sc"); break;
            case "cache":return require("./cache"); break;
            case "config":return require("./config"); break;
            case "system":return require("./system"); break;
            case "db":return require("./db"); break;
            case "w3cdid":return require("./w3cdid"); break;
            case "error":return require("./error"); break;
            case "m2dsu":return require("./m2dsu"); break;
            case "workers":return require("./workers"); break;
            default: throw new Error("Unknown API space " + apiSpaceName);
        }
    }

     function setGlobalVariable(name, value){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                if (typeof self !== "undefined") {
                    self[name] = value;
                } else {
                    reportUserRelevantError("self not defined in Service Workers");
                }
                break;
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (typeof window !== "undefined") {
                    window[name] = value;
                } else {
                    reportUserRelevantError("window not defined in browser environment");
                }
                break;
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                if (typeof global !== "undefined") {
                    global[name] = value;
                } else {
                    reportUserRelevantError("global not defined in nodejs environment");
                }
        }
    };

    function getGlobalVariable(name){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return self[name];
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return window[name];
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return global[name];
        }
    };

    function globalVariableExists(name){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return typeof self[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return typeof window[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return typeof global[name] != "undefined";
        }
    };

    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadApi = loadApi;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadAPI = loadApi; //upper case version just
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.globalVariableExists = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.setGlobalVariable = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.getGlobalVariable = getGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.constants = constants;
    setGlobalVariable("setGlobalVariable",setGlobalVariable);
    setGlobalVariable("getGlobalVariable",getGlobalVariable);
    setGlobalVariable("globalVariableExists",globalVariableExists);
    require("./config/autoConfig");
}
module.exports = PREVENT_DOUBLE_LOADING_OF_OPENDSU;


},{"./anchoring":"/home/runner/work/privatesky/privatesky/modules/opendsu/anchoring/index.js","./bdns":"/home/runner/work/privatesky/privatesky/modules/opendsu/bdns/index.js","./boot":"/home/runner/work/privatesky/privatesky/modules/opendsu/boot/index.js","./bricking":"/home/runner/work/privatesky/privatesky/modules/opendsu/bricking/index.js","./cache":"/home/runner/work/privatesky/privatesky/modules/opendsu/cache/index.js","./config":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/index.js","./config/autoConfig":"/home/runner/work/privatesky/privatesky/modules/opendsu/config/autoConfig.js","./contracts":"/home/runner/work/privatesky/privatesky/modules/opendsu/contracts/index.js","./crypto":"/home/runner/work/privatesky/privatesky/modules/opendsu/crypto/index.js","./db":"/home/runner/work/privatesky/privatesky/modules/opendsu/db/index.js","./dc":"/home/runner/work/privatesky/privatesky/modules/opendsu/dc/index.js","./dt":"/home/runner/work/privatesky/privatesky/modules/opendsu/dt/index.js","./error":"/home/runner/work/privatesky/privatesky/modules/opendsu/error/index.js","./http":"/home/runner/work/privatesky/privatesky/modules/opendsu/http/index.js","./keyssi":"/home/runner/work/privatesky/privatesky/modules/opendsu/keyssi/index.js","./m2dsu":"/home/runner/work/privatesky/privatesky/modules/opendsu/m2dsu/index.js","./moduleConstants.js":"/home/runner/work/privatesky/privatesky/modules/opendsu/moduleConstants.js","./mq":"/home/runner/work/privatesky/privatesky/modules/opendsu/mq/index.js","./notifications":"/home/runner/work/privatesky/privatesky/modules/opendsu/notifications/index.js","./resolver":"/home/runner/work/privatesky/privatesky/modules/opendsu/resolver/index.js","./sc":"/home/runner/work/privatesky/privatesky/modules/opendsu/sc/index.js","./system":"/home/runner/work/privatesky/privatesky/modules/opendsu/system/index.js","./w3cdid":"/home/runner/work/privatesky/privatesky/modules/opendsu/w3cdid/index.js","./workers":"/home/runner/work/privatesky/privatesky/modules/opendsu/workers/index.js"}],"overwrite-require":[function(require,module,exports){
/*
 require and $$.require are overwriting the node.js defaults in loading modules for increasing security, speed and making it work to the privatesky runtime build with browserify.
 The privatesky code for domains should work in node and browsers.
 */
function enableForEnvironment(envType){

    const moduleConstants = require("./moduleConstants");

    /**
     * Used to provide autocomplete for $$ variables
     * @classdesc Interface for $$ object
     *
     * @name $$
     * @class
     *
     */

    switch (envType) {
        case moduleConstants.BROWSER_ENVIRONMENT_TYPE :
            global = window;
            break;
        case moduleConstants.WEB_WORKER_ENVIRONMENT_TYPE:
        case moduleConstants.SERVICE_WORKER_ENVIRONMENT_TYPE:
            global = self;
            break;
        default:
            Error.stackTraceLimit = Infinity;
    }

    if (typeof(global.$$) == "undefined") {
        /**
         * Used to provide autocomplete for $$ variables
         * @type {$$}
         */
        global.$$ = {};
    }

    if (typeof($$.__global) == "undefined") {
        $$.__global = {};
    }

    if (typeof global.wprint === "undefined") {
        global.wprint = console.warn;
    }
    Object.defineProperty($$, "environmentType", {
        get: function(){
            return envType;
        },
        set: function (value) {
            throw Error("Environment type already set!");
        }
    });


    if (typeof($$.__global.requireLibrariesNames) == "undefined") {
        $$.__global.currentLibraryName = null;
        $$.__global.requireLibrariesNames = {};
    }


    if (typeof($$.__runtimeModules) == "undefined") {
        $$.__runtimeModules = {};
    }


    if (typeof(global.functionUndefined) == "undefined") {
        global.functionUndefined = function () {
            console.log("Called of an undefined function!!!!");
            throw new Error("Called of an undefined function");
        };
        if (typeof(global.webshimsRequire) == "undefined") {
            global.webshimsRequire = global.functionUndefined;
        }

        if (typeof(global.domainRequire) == "undefined") {
            global.domainRequire = global.functionUndefined;
        }

        if (typeof(global.pskruntimeRequire) == "undefined") {
            global.pskruntimeRequire = global.functionUndefined;
        }
    }

    const pastRequests = {};

    function preventRecursiveRequire(request) {
        if (pastRequests[request]) {
            const err = new Error("Preventing recursive require for " + request);
            err.type = "PSKIgnorableError";
            throw err;
        }

    }

    function disableRequire(request) {
        pastRequests[request] = true;
    }

    function enableRequire(request) {
        pastRequests[request] = false;
    }

    function requireFromCache(request) {
        const existingModule = $$.__runtimeModules[request];
        return existingModule;
    }

    $$.__registerModule = function (name, module) {
        $$.__runtimeModules[name] = module;
    }

    function wrapStep(callbackName) {
        const callback = global[callbackName];

        if (callback === undefined) {
            return null;
        }

        if (callback === global.functionUndefined) {
            return null;
        }

        return function (request) {
            const result = callback(request);
            $$.__runtimeModules[request] = result;
            return result;
        }
    }


    function tryRequireSequence(originalRequire, request) {
        let arr;
        if (originalRequire) {
            arr = $$.__requireFunctionsChain.slice();
            arr.push(originalRequire);
        } else {
            arr = $$.__requireFunctionsChain;
        }

        preventRecursiveRequire(request);
        disableRequire(request);
        let result;
        const previousRequire = $$.__global.currentLibraryName;
        let previousRequireChanged = false;

        if (!previousRequire) {
            // console.log("Loading library for require", request);
            $$.__global.currentLibraryName = request;

            if (typeof $$.__global.requireLibrariesNames[request] == "undefined") {
                $$.__global.requireLibrariesNames[request] = {};
                //$$.__global.requireLibrariesDescriptions[request]   = {};
            }
            previousRequireChanged = true;
        }
        for (let i = 0; i < arr.length; i++) {
            const func = arr[i];
            try {

                if (func === global.functionUndefined) continue;
                result = func(request);

                if (result) {
                    break;
                }

            } catch (err) {
                if (err.type !== "PSKIgnorableError") {
                    if(typeof err == "SyntaxError"){
                        console.error(err);
                    } else{
                        if(request === 'zeromq'){
                            console.warn("Failed to load module ", request," with error:", err.message);
                        }else{
                            console.error("Failed to load module ", request," with error:", err);
                        }
                    }
                    //$$.err("Require encountered an error while loading ", request, "\nCause:\n", err.stack);
                }
            }
        }

        if (!result) {
            throw Error(`Failed to load module ${request}`);
        }

        enableRequire(request);
        if (previousRequireChanged) {
            //console.log("End loading library for require", request, $$.__global.requireLibrariesNames[request]);
            $$.__global.currentLibraryName = null;
        }
        return result;
    }

    function makeBrowserRequire(){
        console.log("Defining global require in browser");


        global.require = function (request) {

            ///*[requireFromCache, wrapStep(webshimsRequire), , wrapStep(pskruntimeRequire), wrapStep(domainRequire)*]
            return tryRequireSequence(null, request);
        }
    }

    function makeIsolateRequire(){
        // require should be provided when code is loaded in browserify
        const bundleRequire = require;

        $$.requireBundle('sandboxBase');
        // this should be set up by sandbox prior to
        const sandboxRequire = global.require;
        const cryptoModuleName = 'crypto';
        global.crypto = require(cryptoModuleName);

        function newLoader(request) {
            // console.log("newLoader:", request);
            //preventRecursiveRequire(request);
            const self = this;

            // console.log('trying to load ', request);

            function tryBundleRequire(...args) {
                //return $$.__originalRequire.apply(self,args);
                //return Module._load.apply(self,args)
                let res;
                try {
                    res = sandboxRequire.apply(self, args);
                } catch (err) {
                    if (err.code === "MODULE_NOT_FOUND") {
                        const p = path.join(process.cwd(), request);
                        res = sandboxRequire.apply(self, [p]);
                        request = p;
                    } else {
                        throw err;
                    }
                }
                return res;
            }

            let res;


            res = tryRequireSequence(tryBundleRequire, request);


            return res;
        }

        global.require = newLoader;
    }

    function makeNodeJSRequire(){
        const pathModuleName = 'path';
        const path = require(pathModuleName);
        const cryptoModuleName = 'crypto';
        const utilModuleName = 'util';
        $$.__runtimeModules["crypto"] = require(cryptoModuleName);
        $$.__runtimeModules["util"] = require(utilModuleName);

        const moduleModuleName = 'module';
        const Module = require(moduleModuleName);
        $$.__runtimeModules["module"] = Module;

        console.log("Redefining require for node");

        $$.__originalRequire = Module._load;
        const moduleOriginalRequire = Module.prototype.require;

        function newLoader(request) {
            // console.log("newLoader:", request);
            //preventRecursiveRequire(request);
            const self = this;

            function originalRequire(...args) {
                //return $$.__originalRequire.apply(self,args);
                //return Module._load.apply(self,args)
                let res;
                try {
                    res = moduleOriginalRequire.apply(self, args);
                } catch (err) {
                    if (err.code === "MODULE_NOT_FOUND") {
                        let pathOrName = request;
                        if(pathOrName.startsWith('/') || pathOrName.startsWith('./') || pathOrName.startsWith('../')){
                            pathOrName = path.join(process.cwd(), request);
                        }
                        res = moduleOriginalRequire.call(self, pathOrName);
                        request = pathOrName;
                    } else {
                        throw err;
                    }
                }
                return res;
            }

            function currentFolderRequire(request) {
                return
            }

            //[requireFromCache, wrapStep(pskruntimeRequire), wrapStep(domainRequire), originalRequire]
            return tryRequireSequence(originalRequire, request);
        }

        Module.prototype.require = newLoader;
        return newLoader;
    }

    require("./standardGlobalSymbols.js");

    if (typeof($$.require) == "undefined") {

        $$.__requireList = ["webshimsRequire"];
        $$.__requireFunctionsChain = [];

        $$.requireBundle = function (name) {
            name += "Require";
            $$.__requireList.push(name);
            const arr = [requireFromCache];
            $$.__requireList.forEach(function (item) {
                const callback = wrapStep(item);
                if (callback) {
                    arr.push(callback);
                }
            });

            $$.__requireFunctionsChain = arr;
        };

        $$.requireBundle("init");

        switch ($$.environmentType) {
            case moduleConstants.BROWSER_ENVIRONMENT_TYPE:
                makeBrowserRequire();
                $$.require = require;
                break;
            case moduleConstants.WEB_WORKER_ENVIRONMENT_TYPE:
                makeBrowserRequire();
                $$.require = require;
                break;
            case moduleConstants.SERVICE_WORKER_ENVIRONMENT_TYPE:
                makeBrowserRequire();
                $$.require = require;
                break;
            case moduleConstants.ISOLATE_ENVIRONMENT_TYPE:
                makeIsolateRequire();
                $$.require = require;
                break;
            default:
               $$.require = makeNodeJSRequire();
        }

    }

    $$.promisify = function promisify(fn) {
        return function (...args) {
            return new Promise((resolve, reject) => {
                fn(...args, (err, ...res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(...res);
                    }
                });
            });
        };
    };

    $$.makeSaneCallback = function makeSaneCallback(fn) {
        let alreadyCalled = false;
        let prevErr;
        return (err, res, ...args) => {
            if (alreadyCalled) {
                if (err) {
                    console.log('Sane callback error:', err);
                }

                throw new Error(`Callback called 2 times! Second call was stopped. Function code:\n${fn.toString()}\n` + (prevErr ? `Previous error stack ${prevErr.toString()}` : ''));
            }
            alreadyCalled = true;
            if(err){
                prevErr = err;
            }
            return fn(err, res, ...args);
        };
    };
}



module.exports = {
    enableForEnvironment,
    constants: require("./moduleConstants")
};

},{"./moduleConstants":"/home/runner/work/privatesky/privatesky/modules/overwrite-require/moduleConstants.js","./standardGlobalSymbols.js":"/home/runner/work/privatesky/privatesky/modules/overwrite-require/standardGlobalSymbols.js"}],"psk-cache":[function(require,module,exports){
const Cache = require("./lib/Cache")
let cacheInstance;

module.exports = {

    /**
     * Create a new cache instance
     *
     * @param {object} options
     * @param {Number} options.maxLevels Number of storage levels. Defaults to 3
     * @param {Number} options.limit Number of max items the cache can store per level.
     *                               Defaults to 1000
     * @return {Cache}
     */
    factory: function (options) {
        return new Cache(options);
    },

    /**
     * Get a reference to a singleton cache instance
     *
     * @param {object} options
     * @param {Number} options.maxLevels Number of storage levels. Defaults to 3
     * @param {Number} options.limit Number of max items the cache can store per level.
     *                               Defaults to 1000
     * @return {Cache}
     */
    getDefaultInstance: function (options) {
        if (!cacheInstance) {
            cacheInstance = new Cache(options);
        }

        return cacheInstance;
    }
};

},{"./lib/Cache":"/home/runner/work/privatesky/privatesky/modules/psk-cache/lib/Cache.js"}],"pskcrypto":[function(require,module,exports){
const PskCrypto = require("./lib/PskCrypto");
const ssutil = require("./signsensusDS/ssutil");

module.exports = PskCrypto;

module.exports.hashValues = ssutil.hashValues;

module.exports.DuplexStream = require("./lib/utils/DuplexStream");

module.exports.isStream = require("./lib/utils/isStream");
},{"./lib/PskCrypto":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/PskCrypto.js","./lib/utils/DuplexStream":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/DuplexStream.js","./lib/utils/isStream":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/lib/utils/isStream.js","./signsensusDS/ssutil":"/home/runner/work/privatesky/privatesky/modules/pskcrypto/signsensusDS/ssutil.js"}],"swarm-engine/bootScripts/NodeThreadWorkerBootScript":[function(require,module,exports){
const http = require("http");
const worker_threads = "worker_threads";
const { parentPort, workerData } = require(worker_threads);
const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");

const apiHandler = require("./apiHandler");
const apiStandardHandler = require("./apiStandardHandler");
const uploadHandler = require("./uploadHandler");
const downloadHandler = require("./downloadHandler");
const fileRequestHandler = require("./fileRequestHandler");

function boot() {
    const sendErrorAndExit = (error) => {
        parentPort.postMessage({ error });
        setTimeout(() => {
            process.exit(1);
        }, 100);
    };

    process.on("uncaughtException", (error) => {
        console.error("unchaughtException inside worker", error);
        sendErrorAndExit(error);
    });

    if (!workerData) {
        return sendErrorAndExit("invalid data");
    }

    if (!workerData.seed || typeof workerData.seed !== "string") {
        return sendErrorAndExit("missing or invalid seed");
    }
    if (!workerData.authorizationKey) {
        return sendErrorAndExit("missing authorizationKey");
    }

    let { seed, authorizationKey } = workerData;

    const startHttpServer = (dsu) => {
        var httpServer = http.createServer(function (req, res) {
            const { method, url } = req;

            if (!req.headers || req.headers.authorization !== authorizationKey) {
                res.statusCode = 403;
                return res.end("Unauthorized request");
            }

            const requestedPath = url;

            console.log(`requestedPath: ${requestedPath}`);

            if (requestedPath.indexOf("/api-standard") === 0) {
                return apiStandardHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/api?") === 0) {
                return apiHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/upload") === 0) {
                return uploadHandler.handle(dsu, req, res, requestedPath);
            }

            if (requestedPath.indexOf("/download") === 0) {
                return downloadHandler.handle(dsu, res, requestedPath);
            }

            fileRequestHandler.handle(dsu, req, res, seed, requestedPath);
        });

        httpServer.listen(0, function () {
            const serverPort = httpServer.address().port;
            parentPort.postMessage({ port: serverPort, status: "started" });
        });
    };

    try {
        resolver.loadDSU(seed, (err, dsu) => {
            if (err) {
                console.log(`Error loading DSU`, err);
                return sendErrorAndExit(err);
            }

            rawDossier = dsu;
            startHttpServer(dsu);
        });
    } catch (error) {
        parentPort.postMessage({ error, status: "failed" });
        process.exit(-1);
    }
}

boot();

},{"./apiHandler":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/apiHandler.js","./apiStandardHandler":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/apiStandardHandler.js","./downloadHandler":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/downloadHandler.js","./fileRequestHandler":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/fileRequestHandler.js","./uploadHandler":"/home/runner/work/privatesky/privatesky/modules/swarm-engine/bootScripts/NodeThreadWorkerBootScript/uploadHandler.js","http":false,"opendsu":"opendsu"}],"swarmutils":[function(require,module,exports){

let cachedUIDGenerator = undefined;
let cachedSafeUid = undefined;

function initCache(){
    if(cachedUIDGenerator === undefined){
        cachedUIDGenerator = require("./lib/uidGenerator").createUidGenerator(200, 32);
        let  sfuid = require("./lib/safe-uuid");
        sfuid.init(cachedUIDGenerator);
        cachedSafeUid = sfuid.safe_uuid;
    }
}

module.exports = {
    get generateUid(){
        initCache();
        return cachedUIDGenerator.generateUid;
    },
     safe_uuid: function(){
         initCache();
         return cachedSafeUid();
    }
};

module.exports.OwM = require("./lib/OwM");
module.exports.beesHealer = require("./lib/beesHealer");
module.exports.Queue = require("./lib/Queue");
module.exports.combos = require("./lib/Combos");
module.exports.TaskCounter = require("./lib/TaskCounter");
module.exports.SwarmPacker = require("./lib/SwarmPacker");
module.exports.path = require("./lib/path");
module.exports.createPskConsole = function () {
    return require('./lib/pskconsole');
};

module.exports.pingPongFork = require('./lib/pingpongFork');


module.exports.ensureIsBuffer = function (data) {
    if ($$.Buffer.isBuffer(data)) {
        return data;
    }
    let buffer;
    if (ArrayBuffer.isView(data)) {
        buffer = $$.Buffer.from(data.buffer)
    } else {
        buffer = $$.Buffer.from(data);
    }
    return buffer;
}

},{"./lib/Combos":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/Combos.js","./lib/OwM":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/OwM.js","./lib/Queue":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/Queue.js","./lib/SwarmPacker":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/SwarmPacker.js","./lib/TaskCounter":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/TaskCounter.js","./lib/beesHealer":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/beesHealer.js","./lib/path":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/path.js","./lib/pingpongFork":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/pingpongFork.js","./lib/pskconsole":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/pskconsole.js","./lib/safe-uuid":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/safe-uuid.js","./lib/uidGenerator":"/home/runner/work/privatesky/privatesky/modules/swarmutils/lib/uidGenerator.js"}]},{},["/home/runner/work/privatesky/privatesky/builds/tmp/nodeBoot.js"])
                    ;(function(global) {
                        global.bundlePaths = {"webshims":"/home/runner/work/privatesky/privatesky/psknode/bundles/webshims.js","pskruntime":"/home/runner/work/privatesky/privatesky/psknode/bundles/pskruntime.js","pskWebServer":"/home/runner/work/privatesky/privatesky/psknode/bundles/pskWebServer.js","consoleTools":"/home/runner/work/privatesky/privatesky/psknode/bundles/consoleTools.js","blockchain":"/home/runner/work/privatesky/privatesky/psknode/bundles/blockchain.js","openDSU":"/home/runner/work/privatesky/privatesky/psknode/bundles/openDSU.js","nodeBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/nodeBoot.js","testsRuntime":"/home/runner/work/privatesky/privatesky/psknode/bundles/testsRuntime.js","bindableModel":"/home/runner/work/privatesky/privatesky/psknode/bundles/bindableModel.js","loaderBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/loaderBoot.js","swBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/swBoot.js","iframeBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/iframeBoot.js","launcherBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/launcherBoot.js","testRunnerBoot":"/home/runner/work/privatesky/privatesky/psknode/bundles/testRunnerBoot.js"};
                    })(typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
                