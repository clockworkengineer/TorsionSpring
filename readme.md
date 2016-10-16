# Node/JavaScript Data Importer #

This Javascript program watches a configured folder for csv format files that are copied into it and first converts the data to json
which is saved away and then imports the json to an SQL data base via SQL INSERT queries. The database can either be SQLite or an MySQL 
server running on the same or different machine. Files which have headers are processed automatically with there file names being used 
as the table names and the csv file header line used to create the tables fields. If the table does not already exist within the database 
it is created and all the fields are set to type TEXT.


# Imported Packages #


1. **SQLite**	                - *SQLite wrapper*
1. **MySQL**	                - *MySQL wrapper*
1. **chokidar**                - *A  wrapper around node.js fs.watch / fs.watchFile / fsevents.*
1. **comma-separated-values**  - *Process csv files and turn into JSON.*
*
# LOGIN.JSON #

If MySQL is used to store data from the processed files then a login.json file is needed in the applications working directory that has the following contents


{ "dbServer" : "server", "dbUserName" : "user", "dbPassword" : "password", "databaseName" : "database" } 

N.B. Fill in as appropriate.
 
#Implementation issues #

During development it was discovered that when a file was copied into the watch folder that an add event could be  received before the whole file was copied and cause issues with the later processing phases because of the partial file. A search found a technique that involved polling the file every second  with stat after the add event was received to find when its modified time did not change and use  that as a indication of copy completion.

During testing a issue was found with SQLite busy errors. This happened when two or more files in quick succession arrived and where being processed into the SQLite database; this caused record insertions to be missed. The code performed correctly in that it created a new connection performed a transaction and then closed the connection; unfortunately this could lead to having one or more writing connections when SQLite is write one read many. A solution was found that involves creating only one connection per file and instead of closing it just caching it and using it for other requests to the same file. This does have the disadvantage that cached open connections are kept while the program is running, but if no processing is taking place other applications are allowed to read/write the database.
