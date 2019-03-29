/* eslint-disable no-console */
/**
 * @abstract Imports GEDCOM, generates biography that can be pasted in corresponding WikiTree profile
 * @license GPL
 * @author Coert Vonk <MY.NAME@gmail.com>
 * @url https://github.com/cvonk/nodejs-wikitree_biography
 * 
 * The general flow:
 *   A. This code parses the GEDCOM file, and serves a web page at http://localhost:8080/.
 *   B. A web browser opens that webpage, sends a request for a list of names (GET /getIndividualsList)
 *   C. This code replies with the names and associated GEDCOM identifiers.
 *   D. Using the browser, the user selects a name from that list.
 *   E. The browser uses the GEDCOM identifier to request the details (POST /getIndividualDetails).
 *   F. This code replies with the details, including a Person description, a GEDCOMX description (and the WikiTree username if available).
 *   G. The browser uses the Person details to a request the matches from WikiTree (POST Special:SearchPerson).
 *   H. The user copies the WikiTree username of the matching entry back on the left panel in the web browser.
 *   I. The browser sends the GEDCOM identifier along with the WikiTree username back to this code (POST /putGedcomId2WtUsername).
 *   J. This code updates the Persons list on disk. (really only used for the GEDCOM id - WikiTree username mapping)
 *   K. The webbrowser sends a request to WikiTree to request a merge form (POST Special:MergeEdit).
 *   L. The user verifies the facts, and copies the prepared biography from the left panel to the WikiTree bio field, enriches it, previews it, and presses "Merge" to complete
 */

var gedcomFile = require('./dcapwell-gedcom/gedcom.js'),  // local modified version of https://github.com/dcapwell/gedcom.js
    express = require('express'),           // install using 'npm install', details at https://github.com/expressjs/express
    bodyParser = require('body-parser');    // install using 'npm install', details at https://github.com/expressjs/body-parser

var get = require('./get.js'),
    value = require('./value.js'),
    write = require('./write.js'),
    g2gx = require('./g2gx.js'),
    fs = require("fs"),
    person = require('./person.js');

var app = express();

// get path to GEDCOM file from command line argument

const gedcomFname = process.argv[2];
if (process.argc >= 2 || !gedcomFname) {
    console.log("No GEDCOM file specified.")
    return -1;
}
if (!fs.existsSync(gedcomFname)) {
    console.log("GEDCOM file (" + gedcomFname + ') doesn\'t exist');
    return -2;
}

// parse the GEDCOM file, and make it accessible through a web server instance at http:///localhost:8080

gedcomFile.parse(gedcomFname, function (gedcom) {
    gedcom.simplify();

    // use personsFname to map gedcomId to wtUsername
    let persons = [];
    const personsFname = "./person-dump.js";
    if (!fs.existsSync(personsFname)) {  // problems?  ensure the file is not empty!
        console.log('Creating a new persons file from GEDCOM (' + personsFname + '), this will take several minutes ...')
        persons = person.get(gedcom);
        person.write(persons, personsFname); // starting from scratch
        console.log('Created a new persons file (' + personsFname + ')')
    } else {
        persons = require(personsFname);    
    }

    // add wtUsername to gedcom
    let indis = get.byName(gedcom, gedcom, 'INDI');
    for (let indi of indis) {
        let wtUsername = person.getWtUsername(persons, indi.id);
        if (wtUsername) {
            indi.wtUsername = wtUsername;
        }
    }

    // serve web page at /
    app.get('/', function(req, res) {
        res.sendFile('index.html', {root: './client' });
    });

    // serve AJAX data requests
    app.get('/getIndividualsList', function(req, res) {
        let individuals = [];
        let indis = get.byName(gedcom, gedcom, 'INDI');
        for (let indi of indis) {
            let obj = get.byName(gedcom, indi, 'NAME:full');
            let name = value.name(obj, 'full')
            if (indi.wtUsername) {
                name += ' (' + indi.wtUsername + ')';
            }
            individuals.push({id: indi.id, name: name});
        }
        individuals.sort(function(a, b) {
            const nameA = a.name.toUpperCase();
            const nameB = b.name.toUpperCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        res.render('individuals.pug', {individuals: individuals });
    });    
    app.post('/getIndividualDetails', function (req, res) {
        var id = req.param('gedcomId'); //req.body.id;
        let indi = get.byId(gedcom, id);  // I1, I24, I13, I240
        let biography = write.biography(gedcom, indi);  //'== Test ==\n\n1,2,3';
        let gedcomx = g2gx.principal(gedcom, indi);
        let persondetail = person.get(gedcom, indi)[0];
        let wtUsername = person.getWtUsername(persons, id);

        //res.status(500).send("An error has occurred -- " + err);
        res.status(200).json({
            'status': 'success', 
            'gedcomId': indi.id,      // client returns this with wtUsername in '/gedcom-wtUsername' AJAX call
            'wtUsername': wtUsername, // client uses it to prepopupate WikiTree Id field
            'person': persondetail,   // 2BD client uses this to find the matching wikitree profile id
            'gedcomx': gedcomx,       // client uses this to initiate a wikitree merge
            'biography': biography    // client copy'n'pasts this in merge bio form
        });
    });    
    app.post('/putGedcomId2WtUsername', function(req) { 
        var gedcomId = req.param('gedcomId');
        var wtUsername = req.param('wtUsername');
        if (gedcomId && wtUsername) {
            person.setWtUsername(persons, gedcomId, wtUsername);
            person.write(persons, personsFname);  // 2BD: probably don't want to do this every time ..
        } else {
            console.log("ignored /gedcom-wtUsername");
        }
    });
    
    // to test biographies writing on all individuals, enable the next line and disable the app.listen()
    //write.biography(gedcom); //  get.byId(gedcom, indi_)
    app.listen(8080);
    console.log("App listening on http://localhost/index.html");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('client'));
app.set('views', __dirname);
app.set('view engine', 'pug');