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

var path = require('path');
var fs = require('fs');

// Currently SQLIt is only SQL supported

var sqlite3 = require('sqlite3');

// CSV processing and file watch packages.

var CSV = require('comma-separated-values');
var chokidar = require('chokidar');

// Watch and destination folders

var kWatchFolder = './watch/';
var kDestinationFolder = './json/';

// Customization processing. Indexed by file name.

var customised = [];
customised["Accupedo daily logs"] = {translator: accupedo, options: {header: ['year', 'month', 'day', 'steps', 'miles', 'calories', 'duration']}, database: SQLite, databaseName: "accupedo", tableName : "walks"};

// The CSV created by accupedo has three numeric fields for the date so just convert
// those to somthing sensible and copy the rest. Also the file doesn't contain a
// header but chokidar will have added those for us.

function accupedo(record) {
    var newRecord = {};
    var dateOfExecersize = new Date(record.year, record.month, record.day);
    newRecord['date'] = dateOfExecersize.toDateString();
    newRecord['steps'] = record.steps;
    newRecord['miles'] = record.miles;
    newRecord['calories'] = record.calories;
    newRecord['duration'] = record.duration;
    return(newRecord);
}

// Insert data into a SQLite data base and given table.
// If they to not exist then they are created. The table 
// fields all being of type text.

function SQLite(databaseName, tableName, dataJSON) {

    var exists = fs.existsSync(databaseName+".db");

    if (!exists) {
        console.log("Creating DB file.");
        fs.closeSync(fs.openSync(databaseName+".db", "w"));
    }

    // Setup column names for create table and also placeholder string for 
    // insert query (i.e "? ? ?...").
    
    colNames = [];
    colPlaceHolder = [];
    for (var key in dataJSON[0]) {
        if (dataJSON[0].hasOwnProperty(key)) {
            colNames.push(key + " TEXT");
            colPlaceHolder.push("?");
        }
    }

    db = new sqlite3.Database(databaseName+".db");

    db.serialize(function () {

        query = "CREATE TABLE IF NOT EXISTS '" + tableName + "' (" + colNames.join(",") + ");";
        db.run(query, function (err) {
            if (err) {
                console.log(err);
            }
        });

        var stmt = db.prepare("INSERT INTO '" + tableName + "' VALUES (" + colPlaceHolder.join(",") + ")");

        for (var row in dataJSON) {

            colValues = [];

            for (var vals in dataJSON[row]) {

                if (dataJSON[row].hasOwnProperty(vals)) {
                    colValues.push("'" + dataJSON[row][vals] + "'");

                }
            }

            stmt.run(colValues, function (err) {
                if (err) {
                    console.log(err);
                }
            });

        }
        
        stmt.finalize();

    });

    db.close();

}

//  Setup up folder watcher.

var watcher = chokidar.watch(kWatchFolder, {
    ignored: /[\/\\]\./,
    persistent: true
});

// CSV file added. Read its data and convert to JSON and then
// to any database specfied.

watcher.on('add', function (filename) {

    fs.readFile(filename, 'utf8', function (err, data) {

        var dataJSON = [];

        if (err) {
            
            throw err;
            
        } else {

            // Use custom handler if one is avaiable.
            
            var  custom = customised[path.basename(filename)];
            
            // File does not have custom processing so assume first line contains field value and convert.

            if (!custom) {

                console.log(path.basename(filename) + " does not have an translator. Defaulting to header present.");
                dataJSON = CSV.parse(data, {header: true});
                SQLite("default", path.parse(filename).name, dataJSON);

            } else {

                // Use customised function.

                CSV.forEach(data, custom.options, function (record) {
                    dataJSON.push(custom.translator(record));
                });

               custom.database(custom.databaseName, custom.tableName, dataJSON);
                
            }


            // Write JSON to destination file and delete source.

            fs.writeFile(kDestinationFolder + path.basename(filename) + ".json", JSON.stringify(dataJSON), function (err) {
                if (err) {
                   console.log(err);
               } else {
                  console.log("JSON saved to " + path.basename(filename) + ".json");
                  fs.unlinkSync(filename);
                  console.log("Deleting source file : " + filename);
              }
             });
        }
    });
});

// Clean up processing.

process.on('exit', function () {
    console.log("Exiting");
});

console.log("DataImporter Applciation");