/**
 * @abstract Imports GEDCOM, generates biography that can be pasted in corresponding WikiTree profile
 * @license GPL
 * @author Coert Vonk <MY.NAME@gmail.com>
 * @url https://github.com/cvonk/nodejs-wikitree_biography
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

// localization
global.i18n = new (require('i18n-2'))({locales: ['en', 'nl']}); 
i18n.devMode = true;
i18n.setLocale('en');  // test Netherlands locale

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
        console.log('Creating a new persons file from GEDCOM (' + personsFname + '), this will take a few minutes ...')
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
    app.get('/individuals', function(req, res) {
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
    app.post('/individual', function (req, res) {
        var id = req.param('gedcomId'); //req.body.id;
        let indi = get.byId(gedcom, id);  // I1, I24, I13, I240
        let biography = write.biography(gedcom, indi);  //'== Test ==\n\n1,2,3';
        let gedcomx = g2gx.principal(gedcom, indi);
        let persondetail = person.get(gedcom, indi)[0];
        let wtUsername = person.getWtUsername(persons, id);

        if (false /*|| err !== null*/) {
            res.status(500).send("An error has occurred -- " + err);
        } else {
            res.status(200).json({
                'status': 'success', 
                'gedcomId': indi.id,      // client returns this with wtUsername in '/gedcom-wtUsername' AJAX call
                'wtUsername': wtUsername, // client uses it to prepopupate WikiTree Id field
                'person': persondetail,   // 2BD client uses this to find the matching wikitree profile id
                'gedcomx': gedcomx,       // client uses this to initiate a wikitree merge
                'biography': biography    // client copy'n'pasts this in merge bio form
            });
        }
    });    
    app.post('/gedcomId-wtUsername', function(req, res) { 
        var gedcomId = req.param('gedcomId');
        var wtUsername = req.param('wtUsername');
        if (gedcomId && wtUsername) {
            person.setWtUsername(persons, gedcomId, wtUsername);
            person.write(persons, personsFname);  // 2BD: probably don't want to do this every time ..
        } else {
            console.log("ignored /gedcom-wtUsername");
        }
    });
    
    app.listen(8080);    
    console.log("App listening on http://localhost/index.html");

    let personToFind = {
        "gedcomId": "@I508@",
        "name": {
          "given": "Sander Cornelis",
          "last": "Vonk"
        },
        "birth": {
          "date": "12 Nov 2005",
          "place": "Portland, Multnomah, Oregon, USA"
        },
        "father": {
          "gedcomId": "@I240@",
          "name": {
            "given": "Cornelis Johannes Sijbrand",
            "last": "Vonk"
          },
          "birth": {
            "date": "6 Apr 1965",
            "place": "Bergen op Zoom, Noord-Brabant, Netherlands"
          }
        },
        "mother": {
          "gedcomId": "@I203@",
          "name": {
            "given": "Barrie Robin",
            "last": "Levinson"
          },
          "birth": {
            "date": "25 Nov 1965",
            "place": "Westport, Fairfield, Connecticut, USA"
          }
        },
        "siblings": [
          {
            "gedcomId": "@I284@",
            "name": {
              "given": "Johan Daniel Sijbrand",
              "last": "Vonk"
            },
            "birth": {
              "date": "22 Nov 2003",
              "place": "Portland, Multnomah, Oregon, USA"
            }
          }
        ]
      }    ;
    //personJson.match(personToFind);
    //personJson.write(gedcom);  // write to file, to be later matched to WikiTree profile numbers
    //write.biography(gedcom); //, '@I1957@');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('client'));
app.set('views', __dirname);
app.set('view engine', 'pug');