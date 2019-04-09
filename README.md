# GEDCOM to WikiTree Biography

[![Build Status](http://travis-ci.com/cvonk/nodejs-wikitree_biography.svg?branch=master)](https://travis-ci.com/cvonk/nodejs-wikitree_biography)

Imports a GEDCOM to write biographies, and helps you in applying them to corresponding WikiTree profiles.

[![Video version of the HOWTO](https://img.youtube.com/vi/ifpU7WXJaJA/0.jpg)](https://www.youtube.com/watch?v=ifpU7WXJaJA)

## Installing

Run the following in a terminal window, assuming you have already installed [node.js](https://nodejs.org/en/download/)

    git clone https://github.com/cvonk/nodejs-wikitree_biography.git
    cd nodejs-wikitree_biography
    npm install

## Using

* Export a GEDCOM file from your Genealogy Software.  Only export preferred facts.  
* Start the project's server `node app.js gedcom.ged` where `gedcom.ged` is a path to your GEDCOM file.
* Open `localhost:8080` in your internet browser
* Follow the steps shown at the left of the browser window
  1. Start typing a name, and select one from the drop-down list.  This will bring up the search results from WikiTree on the right.
  2. Find the matching profile id from the search results (they are in the format lastname-integer) and paste it on the left.
  3. Verify that the WikiTree profile matches the data from GEDCOM, and copy'n'paste the generated bio on the left to WikiTree. Press preview. Press `merge` on WikiTree.

### Localization

The tool chooses a locale based on where the person is born, baptized or died.  It currently supports English, Dutch and some German.  You can easily add locales, by adding them to the `locales` directory and adding the Country Name to locale abbreviation mapping in `write.js` function `_about.init()` constant `locales`.

## Technical Details

The general flow:
 - This code parses the GEDCOM file, and serves a web page at `http://localhost:8080/`.
 - A web browser opens that webpage, sends a request for a list of names (`GET /getIndividualsList`)
 - This code replies with the names and associated GEDCOM identifiers.
 - Using the browser, the user selects a name from that list.
 - The browser uses the GEDCOM identifier to request the details (`POST /getIndividualDetails`).
 - This code replies with the details, including a Person description, a GEDCOMX description (and the WikiTree username if available).
 - The browser uses the Person details to a request the matches from WikiTree (`POST Special:SearchPerson`).
 - The user copies the WikiTree username of the matching entry back on the left panel in the web browser.
 - The browser sends the GEDCOM identifier along with the WikiTree username back to this code (`POST /putGedcomId2WtUsername`).
 - This code updates the Persons list on disk. (really only used for the GEDCOM id - WikiTree username mapping)
 - The webbrowser sends a request to WikiTree to request a merge form (`POST Special:MergeEdit`).
 - The user verifies the facts, and copies the prepared biography from the left panel to the WikiTree bio field, enriches it, previews it, and presses `Merge` to complete
