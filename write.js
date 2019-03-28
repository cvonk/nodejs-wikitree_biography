/** @module write write about individual based on parsed GEDCOM */
/** @author Coert Vonk <coert vonk at gmail> */

var get = require('./get.js'),
    value = require('./value.js')

const NL = "\n";

function _getNameYearsOcc(gedcom, indi, refs) {
    let ret = '';
    if (gedcom && indi) {
        ret += get.byTemplate(gedcom, indi, refs, ' [NAME:full]');
        const brackets = (indi.BIRT && indi.BIRT.DATE) || (indi.DEAT && indi.DEAT.DATE);
        if (brackets) ret += ' (';
        ret += get.byTemplate(gedcom, indi, refs, '[BIRT.DATE:year]|-[DEAT.DATE:year]|');
        if (brackets) ret += ')';
        ret += get.byTemplate(gedcom, indi, refs, ' [OCCU]| ' + i18n.__('from') + ' [BIRT.PLAC]');
    }
    return ret;
}

function _getParentsFirstNames(gedcom, fam, refs) {
    ret = '';
    if (fam.HUSB) {
        ret += get.byTemplate(gedcom, fam, refs, ' [HUSB.NAME:first]');
    }
    if (fam.HUSB && fam.WIFE) {
        ret += ' ' + i18n.__('and');
    }
    if (fam.WIFE) {
        ret += get.byTemplate(gedcom, fam, refs, ' [WIFE.NAME:first]');
    }
    return ret;
}

function _aboutSibling(gedcom, sibling, refs, half) {
    let yrs = '';
    let yrsYounger = get.byTemplate(gedcom, sibling, refs, '[BIRT.DATE:age]');
    if (yrsYounger.length) {
        if (yrsYounger[1] == '-') {  // has a ~, <, > in front of the minus
            yrs += yrsYounger[0];
            yrsYounger = yrsYounger.slice(1);
        }
        yrs += ', ' + yrsYounger.startsWith('-') ? yrsYounger.slice(1) +  i18n.__(' older') : yrsYounger +  i18n.__(' younger');
    }
    let ret = get.byTemplate(gedcom, sibling, refs, '* ' + half + '[SEX:broerzus]| [NAME:given]| "[NAME:aka]"') + yrs;
    ret += get.byTemplate(gedcom, sibling, refs, ', [OCCU]');
    if (sibling.BIRT && sibling.BIRT.DATE ) {
        value.birthday.push(sibling.BIRT.DATE.value);
        ret += get.byTemplate(gedcom, sibling, refs, ', ' + i18n.__('turns') + ' [DEAT.DATE:age]');
        value.birthday.pop();
    }
    return ret;
}

function _aboutAddress(gedcom, obj, refs) {
    let ret = get.byTemplate(gedcom, obj, refs, '[DATE],');
    if (obj.TYPE) {
        switch (obj.TYPE.value) {
            case 'Arrival': ret += ' ' + i18n.__('arrival'); break;
            case 'Departure': ret += ' ' + i18n.__('departure'); break;
            default: ret += obj.TYPE.value;
        }
    }
    ret += get.byTemplate(gedcom, obj, refs, ' in [PLAC]');
    if (obj.value) {
        ret += ', ' + obj.value;
    }
    return ret;
}

function _aboutSpouse(gedcom, spouse, refs, mar) {
    let ret = '';
    if (gedcom && spouse) {
        value.birthday.push(spouse.BIRT && spouse.BIRT.DATE ? spouse.BIRT.DATE.value : undefined);
        {
            ret += get.byTemplate(gedcom, spouse, refs, ' ' + i18n.__('with') + ' [NAME:full]');
            ret += get.byTemplate(gedcom, mar, refs, ' ([DATE:age])');
            ret += get.byTemplate(gedcom, spouse, refs, ' from [BIRT.PLAC]|, [OCCU]|.');
            ret += about.parents(gedcom, spouse);
            let death = get.byTemplate(gedcom, spouse, refs, '[NAME:first]| ' + i18n.__('died on') + ' [DEAT]| ([DEAT.DATE:age])| ' + i18n.__('due to') + ' [DEAT.CAUS]|.');
            if (death.length) {
                let ret = ' ' + NL;
                ret += get.byTemplate(gedcom, spouse, refs, '[NAME:first]|') + death;
            }
            ret += NL;
        }
        value.birthday.pop();
    }
    return ret;
}

function _getDeath(gedcom, indi, refs, long) {
    let ret = '';
    if (gedcom && indi && indi.DEAT) {
        if (indi.BIRT && indi.BIRT.DATE) {
            value.birthday.push(indi.BIRT.DATE.value);
            if (long) {
                ret += get.byTemplate(gedcom, indi, refs, '[NAME:first]| ' + i18n.__('died on') + ' [DEAT]| ([DEAT.DATE:age])| ' + i18n.__('due to') + ' [DEAT.CAUS]|');
            } else {
                ret += get.byTemplate(gedcom, indi, refs, ', ' + i18n.__('turns') + ' [DEAT.DATE:age]');
            }
            value.birthday.pop();
        } else {
            ret += get.byTemplate(gedcom, indi, refs, ', ' + i18n.__('dies on') + ' [DEAT.DATE]');
        }
    }
    return ret;
}

function _aboutChild(gedcom, child, refs) {
    let ret = ''
    if (gedcom && child) {
        ret += get.byTemplate(gedcom, child, refs, ' [SEX:zoondochter]| [NAME:given]|, ' + i18n.__('born in') + ' [BIRT.DATE:year]|, [OCCU]');

        ret += _getDeath(gedcom, child, false);
    }
    return ret;
}

function _aboutOld(gedcom, indi, refs) {
    let ret = '';
    if (gedcom && indi) {
        ret += _getDeath(gedcom, indi, refs, true) + '.' + NL;
    }
    return ret;
}

let about = {

    parents: function (gedcom, indi, refs) {
        if (gedcom && indi) {
            let ret = '';
            let fams = get.byName(gedcom, indi, 'FAMC');
            if (fams[0]) {
                ret += get.byTemplate(gedcom, indi, refs, ' [SEX:hijzij]| ' + i18n.__('is a') + ' [SEX:zoondochter] ' + i18n.__('of'));
                for (let fam of fams) {  // for children that were latter assigned a father
                    if (fam) {
                        if (fam.HUSB || fam.WIFE) {
                            if (fam.HUSB) {
                                ret += _getNameYearsOcc(gedcom, get.byName(gedcom, fam, 'HUSB')[0], refs);
                            }
                            if (fam.HUSB && fam.WIFE) {
                                ret += ' ' + i18n.__('and');
                            }
                            if (fam.WIFE){
                                ret += _getNameYearsOcc(gedcom, get.byName(gedcom, fam, 'WIFE')[0], refs);
                            }
                        }
                        ret += '.' + NL;
                    }
                }
            }
            return ret;
        }       
    },

    introduction: function (gedcom, indi, refs) {
        if (gedcom && indi) {
            let ret = "";
            ret += get.byTemplate(gedcom, indi, refs, '[NAME:full]| ' + i18n.__('is born on') + ' [BIRT]|.');
            ret += this.parents(gedcom, indi);
            if (indi.FAMC) {
                ret += ' ' + NL;
                let fams = get.byName(gedcom, indi, 'FAMC');
                for (let fam of fams) {  // for children that were latter assigned a father
                    if (fam.HUSB || fam.WIFE) {
                        ret +=  i18n.__('Other children of') + _getParentsFirstNames(gedcom, fam, refs) + ':' + NL;                        
                    } else {
                        ret += i18n.__("Half siblings:") + NL;
                    }
                    let siblings = get.byName(gedcom, fam, 'CHIL');
                    let half = i18n.__('half');
                    if (siblings) {
                        for (let sibling of siblings) {
                            if (sibling.id == indi.id) {
                                half = '';
                            }
                        }
                    }
                    if (siblings) {
                        for (let sibling of siblings) {
                            if (sibling.id != indi.id) { //exclude self
                                ret += _aboutSibling(gedcom, sibling, refs, half) + '.' + NL;
                            }
                        }
                    }
                }
            }
            ret += ' ' + NL;
            return ret;
        }
    },

    childhood: function (gedcom, indi, refs) {
        if (gedcom && indi) {
            let ret = ""
            if (indi.OCCU) {
                ret += get.byTemplate(gedcom, indi, refs, '[NAME:first]| ' + i18n.__('worked as') + ' [OCCU]') + '.' + NL;
            }    
            let dates = [];
            if (indi.ADDR || indi.EVEN) {
                ret += ' ' + NL + "'''" + i18n.__('Childhood') + "'''" + NL + ' ' + NL;
                ret += get.byTemplate(gedcom, indi, refs, '[SEX:hijzij] ' + i18n.__('lived at') + ':') + NL;
                events = [];
                for (src of ['ADDR', 'EVEN']) {
                    if (indi[src]) {
                        let objs = get.byName(gedcom, indi, src);
                        for (let obj of objs) {
                            ret += '* ' + _aboutAddress(gedcom, obj, refs) + '.' + NL;
                        }
                    }
                }
            }
            return ret;
        }
    },

    relationships: function (gedcom, indi, refs) {
        let ret = "";
        if (gedcom && indi && indi.FAMS) {
            ret += ' ' + NL +  "'''" + i18n.__('Relationships') + "'''" + NL;
            let fams = get.byName(gedcom, indi, 'FAMS');
            for (let fam of fams) {
                ret += ' ' + NL;
                ret += get.byTemplate(gedcom, indi, refs, '[NAME:first]');
                
                let mars = get.byName(gedcom, fam, 'MARR');  // some people are married at 2 different churches
                if (mars[0]) {
                    for (let mar of mars) {
                        ret += get.byTemplate(gedcom, mar, refs, ' ([DATE:age])|, ' + i18n.__('married on') + ' [DATE]');
                    }
                }
                let spouse = get.spouse(gedcom, fam, indi);
                ret += _aboutSpouse(gedcom, spouse, refs, mars[0]);
                if (fam.CHIL) {
                    ret += ' ' + NL;
                    ret += get.byTemplate(gedcom, indi, refs, i18n.__('Children of') + ' [NAME:first]');
                    ret += get.byTemplate(gedcom, spouse, refs, ' ' + i18n.__('and') + ' [NAME:first]:') + NL;
                    let childIds = get.byName(gedcom, fam, 'CHIL');
                    for (let childId of childIds) {
                        if (childId.id != indi.id) { //exclude self
                            let child = get.byId(gedcom, childId.id);
                            ret += '* ' + _aboutChild(gedcom, child, refs) + '.' + NL;
                        }
                    }
                }
            }
        }
        return ret;
    },

    oldday: function (gedcom, indi, refs) {
        let ret = '';
        if (gedcom && indi && indi.DEAT) {
            ret += ' ' +  NL + "'''" + i18n.__('The old day') + "'''" + NL + ' ' + NL;
            ret += _aboutOld(gedcom, indi, refs);
        }
        return ret;
    }
}

let References = class {
    constructor () {
        this.alreadyReferenced = [];
    }
    add(gedcom, sours) {
        let ret = "";
        if (sours) {
            if (!(sours instanceof Array)) {
                sours = [sours];
            }
            for (let sour of sours) {
                const shortId = sour.id.replace(/^@|@$/g, '')
                let existingRefId = this.alreadyReferenced.find(function(el) {
                    return el == shortId;
                });
                if (existingRefId) {
                    ret += '<ref name="' + existingRefId + '" />';
                } else {
                    this.alreadyReferenced.push(shortId);
                    ret += '<ref name="' + shortId + '">';
                    ret += get.sourceTitle(gedcom, sour.id);
                    if (sour.PAGE) ret += sour.PAGE.value;
                    if (sour.QUAY) ret += ', quality ' + sour.QUAY.value + '/4';
                    if (sour.NOTE) ret += ' [' + sour.NOTE.value + ']';
                    if (sour.DATA && sour.DATA.TEXT) ret += NL + sour.DATA.TEXT.value;
                    ret += '</ref>';
                }
            }
        }
        return ret;
    }
}

module.exports = {

    biography: function (gedcom, indi_) {  // indi_ optional, defaults to all

        let refs = new References();
        let indis = indi_ ? [indi_] : get.byName(gedcom, gedcom, 'INDI');

        for (let indi of indis) {            
            //console.log(indi.id)
            value.birthday.date = undefined;
            if (gedcom && indi && indi.BIRT && indi.BIRT.DATE) {
                value.birthday.date = indi.BIRT.DATE.value;  // for calculating ages
            }
            let ret = "== Biography ==" + NL;
            ret += about.introduction(gedcom, indi, refs);
            ret += about.childhood(gedcom, indi, refs);
            ret += about.relationships(gedcom, indi, refs);
            ret += about.oldday(gedcom, indi, refs);
            ret += '== Sources ==\n<references />';
            if (indi_) {
                return ret;
            }
        }
    }
};

