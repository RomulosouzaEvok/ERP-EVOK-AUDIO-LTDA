/**
 * Script utilitario para ajustar o dialect padrao do database.ts.
 *
 * Mantido apenas como ferramenta historica de manutencao local.
 */

import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, 'server', 'src', 'config', 'database.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("|| 'postgres'", "|| 'mysql'");

fs.writeFileSync(filePath, content);
console.log('database.ts updated - dialect default changed to mysql');
