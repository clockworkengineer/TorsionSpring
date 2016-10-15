/* 
 * The MIT License
 *
 * Copyright 2016 Robert Tizzard.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// Node specific imports

var path = require("path");
var fs = require("fs");

// CSV processing and file watch packages.

var CSV = require("comma-separated-values");
var chokidar = require("chokidar");

// Environment details (watch / JSON estination folders etc).
// CHeck folders are preent creating if not.

var environment = require("./di_environment.js");
environment.createFolders();

// Pull in customisations file 

var customisations = require("./di_customisations.js");

// Process file.

function processFile(fileName, data) {

    // Parse CSV file and produce JSON data.

    var dataJSON = [];

    var custom = customisations(path.basename(fileName), {databaseName: "default", tableName: path.parse(fileName).name});

    dataJSON = CSV.parse(data, custom.options);

    // Write JSON to destination file and delete source.

    fs.writeFile(environment.destinationFolder + path.parse(fileName).name + ".json", JSON.stringify(dataJSON), function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log("JSON saved to " + path.parse(fileName).name + ".json");
            fs.unlinkSync(fileName);
            console.log("Deleting source file : " + fileName);
        }
    });

    // Execute custom handler for data

    custom.handler(custom.params, dataJSON);

}

// Makes sure that the file added to the directory, but may not have been completely 
// copied yet by the Operating System, finishes being copied before it attempts to do 
// anything with the file.

function checkFileCopyComplete(fileName, prev) {

    fs.stat(fileName, function (err, stat) {

        if (err) {
            console.error(err);
            return;
        }
        
        if (stat.mtime.getTime() === prev.mtime.getTime()) {
            
            fs.readFile(fileName, "utf8", function (err, data) {

                if (err) {
                    console.error("Error Handling file: " + fileName);
                    console.error(err);
                } else {
                    processFile(fileName, data);
                }

            });

        } else {
            setTimeout(checkFileCopyComplete, environment.fileCopyDelaySeconds * 1000, fileName, stat);
        }
    });
}

//  Setup up folder watcher.

var watcher = chokidar.watch(environment.watchFolder, {
    ignored: /[\/\\]\./,
    persistent: true
});

// CSV file added. Read its data and convert to JSON and then
// to any database specfied.

watcher
        .on('ready', function () {
            console.log('Initial scan complete. Ready for changes.');
        })
        .on('unlink', function (fileName) {
            console.log('File: ' + fileName + ', has been REMOVED');
        })
        .on('error', function (err) {
            console.error('Chokidar file watcher failed. ERR: ' + err.message);
        })
        .on("add", function (fileName) {

            fs.stat(fileName, function (err, stat) {

                if (err) {
                    console.error('Error watching file for copy completion. ERR: ' + err.message);
                    console.error('Error file not processed. PATH: ' + fileName);
                } else {
                    console.log('File copy started...');
                    setTimeout(checkFileCopyComplete, environment.fileCopyDelaySeconds * 1000, fileName, stat);
                }
            });

        });

// Clean up processing.

process.on("exit", function () {
    console.log("DataImporter Applciation Exiting.");
});

console.log("DataImporter Applciation Started \n");