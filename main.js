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

// Node.js specific imports

var path = require("path");
var fs = require("fs");

// CSV processing and file watch packages.

var CSV = require("comma-separated-values");
var chokidar = require("chokidar");

// Watch and destination folders

var environment = require("./di_environment.js");

environment.createFolders();

// Pull in customisations file 

var customisations = require("./di_customisations.js");

//  Setup up folder watcher.

var watcher = chokidar.watch(environment.watchFolder, {
    ignored: /[\/\\]\./,
    persistent: true
});

// CSV file added. Read its data and convert to JSON and then
// to any database specfied.

watcher
    .on('ready', function() { console.log('Initial scan complete. Ready for changes.'); })
    .on('unlink', function(path) { console.log('File: ' + path + ', has been REMOVED'); })
    .on('error', function(err) {console.error('Chokidar file watcher failed. ERR: ' + err.message); })
    .on("add", function (filename) {

    fs.readFile(filename, "utf8", function (err, data) {

        console.log('File+ '+path+' has been ADDED.');
        
        var dataJSON = [];

        if (err) {
           
           console.error("Error Handling file: "+filename);
           console.error(err);

        } else {


            // Parse CSV file and produce JSON data.

            var custom = customisations(path.basename(filename), {databaseName: "default", tableName: path.parse(filename).name});

            dataJSON = CSV.parse(data, custom.options);

            // Write JSON to destination file and delete source.

            fs.writeFile(environment.destinationFolder +  path.parse(filename).name + ".json", JSON.stringify(dataJSON), function (err) {
                if (err) {
                    console.error(err);
                } else {
                    console.log("JSON saved to " + path.parse(filename).name + ".json");
                    fs.unlinkSync(filename);
                    console.log("Deleting source file : " + filename);
                }
            });

            // Execute custom handler for data
            
            custom.handler(custom.params, dataJSON);

        }
    });
});

// Clean up processing.

process.on("exit", function () {
    console.log("Exiting");
});

console.log("DataImporter Applciation\n");