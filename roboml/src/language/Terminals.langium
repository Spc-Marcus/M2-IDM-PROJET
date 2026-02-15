
terminal ID returns string: /[_a-zA-Z][_a-zA-Z0-9]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING returns string: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
hidden terminal WS: /\s+/;
