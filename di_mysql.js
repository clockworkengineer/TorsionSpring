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

// File handling module

var fs = require('fs');

// Import for MySQL bindings

var mysql = require('mysql');
var pool;

module.exports = {

    SQLInit: function () {

    },

    // Create a pool to handle SQL queries. Note SQL server, user and password
    // etc need to be read from a login.json in the same directory as the app.

    SQL: function (params, dataJSON) {

        try {

            // Connect to server

            var loginDetails = JSON.parse(fs.readFileSync('./login.json', 'utf8'));

            pool = mysql.createPool({
                connectionLimit: 100, //important
                host: loginDetails.dbServer,
                user: loginDetails.dbUserName,
                password: loginDetails.dbPassword,
                database: loginDetails.databaseName,
                debug: false
            });

            // Signal an error

        } catch (err) {

            if (err.code === 'ENOENT') {
                console.log('login.json not found.');
                console.log('Contents should be: { "dbServer" : "", "dbUserName" : "", "dbPassword" : "", "databaseName" : "" }');

            } else {
                console.error(err);
            }

            // Do not go any further in handling file

            return;
        }

        // Grab a pool connection

        pool.getConnection(function (err, connection) {

            // Write any error message and return.

            if (err) {
                console.error(err);
                return;
            }

            // Ready for queries.

            console.log('connected as SQL Server id ' + connection.threadId);

            // Setup column names for create table and also placeholder string for 
            // insert query (i.e "? ? ?...").

            colNames = [];
            colPlaceHolder = [];
            for (var key in dataJSON[0]) {
                if (dataJSON[0].hasOwnProperty(key)) {
                    colNames.push(key + " VARCHAR(255)");
                    colPlaceHolder.push("?");
                }
            }

            // Create table

            query = "CREATE TABLE IF NOT EXISTS " + params.tableName + " (" + colNames.join(",") + ");";

            connection.query(query, function (err, rows) {
                if (err) {
                    console.error(err);
                }
            });

            // Insert records.

            query = "INSERT INTO " + params.tableName + " VALUES (" + colPlaceHolder.join(",") + ")";

            for (var row in dataJSON) {

                colValues = [];

                for (var vals in dataJSON[row]) {

                    if (dataJSON[row].hasOwnProperty(vals)) {
                        colValues.push("'" + dataJSON[row][vals] + "'");

                    }
                }

                // Perform INSERT for record.

                connection.query(query, colValues, function (err, rows) {
                    if (err) {
                        console.error(err);
                    }
                });

            }

            // Release pooled conenction.

            console.log("Server connection release.");
            connection.release();

        });

    },

    SQLTerm: function () {

    }
    
};

