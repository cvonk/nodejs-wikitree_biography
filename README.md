# nodejs-wikitree_biography
Imports a GEDCOM to write biographies, and helps you in applying them to corresponding WikiTree profiles.

## Installing

Run the following in a terminal window, assuming you have already installed [node.js](https://nodejs.org/en/download/)

    git clone https://github.com/cvonk/nodejs-wikitree_biography.git
    cd nodejs-wikitree_biography
    npm install

# Using

* Export a GEDCOM file from your Genealogy Software.  Only export preferred facts.  
* Start the project's server `node app.js gedcom.ged` where `gedcom.ged` is a path to yor GEDCOM file.
* Open `localhost:8080` in your internet browser
* Follow the steps shown at the left of the browser window
  1. Start typing a name, and select one from the drop-down list.  This will bring up the search results from WikiTree on the right.
  2. Find the matching profile id from the search results (they are in the format lastname-integer) and paste it on the left.
  3. Verify that the WikiTree profile matches the data from GEDCOM, and copy'n'paste the generated bio on the left to WikiTree. Press preview. Press `merge` on WikiTree.
  
  
