const fs = require('fs');
let code = fs.readFileSync('src/Dashboard.tsx', 'utf8');

const searchStr = `            </div>
          )}
        </div>
      </div>

      <div className="grid`;

const replaceStr = `            </div>
          )}
        </div>
        </div>
      </div>

      <div className="grid`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/Dashboard.tsx', code);
