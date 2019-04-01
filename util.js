/** @module values various utility functions */
/** @author Coert Vonk <MY.NAME@gmail.com> */

module.exports = {

    // src https://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
    typeOf: function(obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    },
      
    // src https://stackoverflow.com/questions/13926213/checking-the-types-of-function-arguments-in-javascript
    assertTypes: function(args, types) {
        args = [].slice.call(args);
        for (let ii in types ) {
            const found = this.typeOf(args[ii]);
            const expected = types[ii];
            if (found != expected) {
                throw new TypeError("param (" + ii + ") must be of type '" + expected + ", instead of '" + found  + "'");
            }
        }
    }
}