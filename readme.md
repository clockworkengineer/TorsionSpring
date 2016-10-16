# Node/JavaScript Data Importer #

This Javascript program watches a configured folder for csv format files that are tcopied into it and first converts the data to json
which is saved away and then imports the json to an SQL data base via SQL INSERT queries. The datbase can either be SQlite or an MySQL 
server runnign on the same or different machine. Files which have headers are processed automtically with there file names being used 
as the table names and the header line used to create the tables fields. If the table does not exist it is created and all the fields
are set to type TEXT.


# Imported Packages #


1. SQlite	                - SQlite wrapper
1. MySQL	                - MySQL wrapper
1. chokidar                - A  wrapper around node.js fs.watch / fs.watchFile / fsevents.
1. comma-separated-values  - Process CSV files abnd turn into JSON.

# LOGIN.JSON #

If MySQL is used then a login.json file is needed in the appliations working directory that has the following contents


{ "dbServer" : "server", "dbUserName" : "user", "dbPassword" : "password", "databaseName" : "database" } 

N.B. Fill in as appropriate.

