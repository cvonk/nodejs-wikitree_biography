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
    I18n = require('i18n-2'),
    person = require('./person.js');

var app = express();

// get path to GEDCOM file from command line argument

const gedcomFname = process.argv[2];
if (process.argc >= 2 || !gedcomFname) {
    console.log("No GEDCOM file specified.");
    process.exit(-1);
}
if (!fs.existsSync(gedcomFname)) {
    console.log("GEDCOM file (" + gedcomFname + ') doesn\'t exist');
    process.exit(-2);
}

// parse the GEDCOM file, and make it accessible through a web server instance

gedcomFile.parse(gedcomFname, function (gedcom) {
    
    gedcom.simplify();
    
    /**
     * Add WikiTree usernames to 'gedcom' based on the 'gedcomId to wtUsername' mapping (if present) in file personsFname
     */
    let persons = [];
    const personsFname = "./data/person-dump.js";
    if (!fs.existsSync(personsFname) || fs.statSync(personsFname).size == 0) {  // start afresh if file err/missing
        console.log('Creating a new persons file from GEDCOM (' + personsFname + '), this will take several minutes ...')
        persons = person.get(gedcom);
        person.write(persons, personsFname);
        console.log('Created a new persons file (' + personsFname + ')')
    } else {
        persons = require(personsFname);    
    }
    let indis = get.byName(gedcom, gedcom, 'INDI');
    for (let indi of indis) {
        let wtUsername = person.getWtUsername(persons, indi.id);
        if (wtUsername) {
            indi.wtUsername = wtUsername;
        }
    }

    /**
     * Serve web page at http://localhost:8080/
     */
    app.get('/', function(req, res) {
        res.sendFile('index.html', {root: './client' });
    });

    /**
     * Serve AJAX data requests at http://localhost:8080/getIndividualsList
     */
    app.get('/getIndividualsList', function(req, res) {
        let individuals = [];
        let indis = get.byName(gedcom, gedcom, 'INDI');
        let i18n = new I18n({ locales: ['xx'] });  // to shorten 'before ', 'about ', 'after ' to '<', '~', '>'
        for (let indi of indis) {
            let obj = get.byName(gedcom, indi, 'NAME');
            let name = value.name(obj, 'last,given') + get.lifeSpan(i18n, gedcom, indi, undefined);
            if (indi.wtUsername) {
                name += ' [' + indi.wtUsername + ']';
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
        let prevName = ''; let ii = 1;  // make names unique, so the prev/next bottons on the client work as expected
        for (let idx in individuals) {
            if (individuals[idx].name == prevName) {
                individuals[Number(idx)-1].name += '-' + (ii);
                individuals[idx].name += '-' + (++ii);
            } else {
                ii = 1;
                prevName = individuals[idx].name;
            }
        }
        let ret = '';
        for (let individual of individuals) {
            ret += '<option id="' + individual.id + '">' + individual.name + '</option>';
        }
        res.status(200).send(ret);
        //res.render('individuals.pug', {individuals: individuals });
    });    

    /**
     * Serve AJAX data requests at http://localhost:8080/getIndividualDetails
     */
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

    /**
     * Serve AJAX data requests at http://localhost:8080/putGedcomId2WtUsername
     */
    app.post('/putGedcomId2WtUsername', function(req, res) { 
        var gedcomId = req.param('gedcomId');
        var wtUsername = req.param('wtUsername');
        if (gedcomId) {
            person.setWtUsername(persons, gedcomId, wtUsername);
            person.write(persons, personsFname);  // 2BD: probably don't want to do this every time ..
        } else {
            console.log("ignored /gedcom-wtUsername");
        }
        res.status(200).send('success');
    });

    /**
     * To test biographies writing on all individuals, enable the next line and disable the app.listen()
     */
    //write.biography(gedcom); //  get.byId(gedcom, indi_)
    app.listen(8080);
    console.log("App listening on http://localhost:8080/");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('client'));
app.set('views', __dirname);
app.set('view engine', 'pug');